import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { upsertSignal } from '../api/signals'
import { Button } from '../components/Button'
import { RevisitPicker, revisitFromPicker } from '../components/RevisitPicker'
import { Screen } from '../components/AppShell'
import {
  computeExpiresAt,
  formatRevisitMessage,
  isRevisitRequiredSatisfied,
  shouldShowExtendTalkNudge,
} from '../domain/expiry'
import {
  NOTE_MAX_LENGTH,
  PRESET_LIST,
  REQUEST_TAG_LABELS,
  REQUEST_TAGS,
  SIGNAL_PRESETS,
  type PresetId,
  type RequestTag,
  type RevisitOptionId,
} from '../domain/signals'
import { useCurrentSignal } from '../features/home/useCoupleRealtime'
import { useAuth } from '../features/session/AuthProvider'
import { useMembership } from '../features/session/hooks'

export function SignalPage() {
  const { user } = useAuth()
  const membership = useMembership()
  const mySignal = useCurrentSignal(user?.id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [presetId, setPresetId] = useState<PresetId | null>(null)
  const [tags, setTags] = useState<RequestTag[]>([])
  const [note, setNote] = useState('')
  const [revisitOption, setRevisitOption] = useState<RevisitOptionId>('h1')
  const [customLocal, setCustomLocal] = useState('')
  const [error, setError] = useState<string | null>(null)

  const preset = presetId ? SIGNAL_PRESETS[presetId] : null

  const revisitAt = useMemo(() => {
    if (!presetId) return null
    return revisitFromPicker(revisitOption, customLocal, new Date())
  }, [presetId, revisitOption, customLocal])

  const canSend =
    Boolean(presetId) &&
    (!preset?.revisitRequired || isRevisitRequiredSatisfied(presetId!, revisitAt))

  function selectPreset(id: PresetId) {
    setPresetId(id)
    const next = SIGNAL_PRESETS[id]
    setRevisitOption(next.defaultRevisitOptionId)
    if (!next.showRequestChips) setTags([])
  }

  function toggleTag(tag: RequestTag) {
    setTags((curr) =>
      curr.includes(tag) ? curr.filter((t) => t !== tag) : [...curr, tag],
    )
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user || !membership.data || !presetId) return
      const sentAt = new Date()
      await upsertSignal({
        userId: user.id,
        coupleId: membership.data.couple_id,
        presetId,
        requestTags: tags,
        note: note.trim() ? note.trim() : null,
        revisitAt,
        expiresAt: computeExpiresAt(presetId, sentAt, revisitAt),
        extendCount: 0,
      })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['signal'] })
      navigate('/', { replace: true })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : '送れませんでした')
    },
  })

  return (
    <Screen className="pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm text-muted"
      >
        戻る
      </button>
      <h1 className="mt-3 text-2xl font-medium">いまの気持ちを選ぶ</h1>
      <p className="mt-2 text-sm text-muted">
        選んで送るだけです。要望や期限はあとから足せます。
      </p>

      <div className="mt-5 grid grid-cols-1 gap-2">
        {PRESET_LIST.map((item) => {
          const active = item.id === presetId
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => selectPreset(item.id)}
              className={`flex min-h-14 items-center gap-3 rounded-2xl px-4 text-left ${
                active
                  ? 'bg-sage text-white shadow-sm'
                  : 'bg-card text-ink border border-line'
              }`}
            >
              <span className="text-xl" aria-hidden>
                {item.emoji}
              </span>
              <span className="text-[15px] font-medium leading-snug">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>

      {preset ? (
        <div className="mt-6 space-y-5">
          {preset.showRequestChips ? (
            <div>
              <p className="mb-2 text-sm text-muted">伝えておきたいこと（任意）</p>
              <div className="flex flex-wrap gap-2">
                {REQUEST_TAGS.map((tag) => {
                  const on = tags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-2 text-sm ${
                        on ? 'bg-sage text-white' : 'bg-card border border-line'
                      }`}
                    >
                      {REQUEST_TAG_LABELS[tag]}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          <label className="block text-sm text-muted">
            一言（任意・{NOTE_MAX_LENGTH}文字まで）
            <input
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              onChange={(e) => setNote(e.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-ink outline-none focus:border-sage"
            />
          </label>

          <RevisitPicker
            selected={revisitOption}
            onSelect={setRevisitOption}
            customLocal={customLocal}
            onCustomLocal={setCustomLocal}
            requireDeadline={preset.revisitRequired}
          />

          <p className="text-sm text-muted">{formatRevisitMessage(revisitAt)}</p>

          {shouldShowExtendTalkNudge(mySignal.data?.extend_count ?? 0) &&
          mySignal.data?.preset === presetId ? (
            <p className="text-sm text-muted">少し話してみませんか？</p>
          ) : null}

          {error ? <p className="text-sm text-peach">{error}</p> : null}

          <Button
            type="button"
            disabled={!canSend || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? '送っています…' : 'この合図を送る'}
          </Button>
        </div>
      ) : null}
    </Screen>
  )
}
