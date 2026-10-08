import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchProfile } from '../api/couples'
import { sendReaction } from '../api/reactions'
import { upsertSignal } from '../api/signals'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { RevisitPicker, revisitFromPicker } from '../components/RevisitPicker'
import { SignalView } from '../components/SignalView'
import {
  computeExpiresAt,
  REST_OF_DAY_NOTE,
  shouldShowExtendTalkNudge,
} from '../domain/expiry'
import {
  REACTION_LABELS,
  REACTION_KINDS,
  SIGNAL_PRESETS,
  type PresetId,
  type ReactionKind,
  type RevisitOptionId,
} from '../domain/signals'
import { useCoupleRealtime, useCurrentSignal, useReactions } from '../features/home/useCoupleRealtime'
import { useNow } from '../features/home/useNow'
import { useRevisitPrompt } from '../features/home/useRevisitPrompt'
import { useAuth } from '../features/session/AuthProvider'
import { useCoupleMembers, useMembership, useProfile } from '../features/session/hooks'

export function HomePage() {
  const { user } = useAuth()
  const now = useNow()
  const profile = useProfile()
  const membership = useMembership()
  const coupleId = membership.data?.couple_id
  const members = useCoupleMembers(coupleId)
  const queryClient = useQueryClient()

  const partnerMember = members.data?.find((m) => m.user_id !== user?.id)
  const partnerProfile = useQuery({
    queryKey: ['profile', partnerMember?.user_id],
    queryFn: () => fetchProfile(partnerMember!.user_id),
    enabled: Boolean(partnerMember?.user_id),
  })

  const mySignal = useCurrentSignal(user?.id)
  const partnerSignal = useCurrentSignal(partnerMember?.user_id)
  const reactions = useReactions(user?.id)
  useCoupleRealtime(coupleId)

  const prompt = useRevisitPrompt(mySignal.data)
  const [extendOpen, setExtendOpen] = useState(false)
  const [revisitOption, setRevisitOption] = useState<RevisitOptionId>('h1')
  const [customLocal, setCustomLocal] = useState('')

  const received = useMemo(() => {
    const mine = mySignal.data
    if (!mine || !user) return null
    return (
      reactions.data?.find(
        (r) =>
          r.to_user_id === user.id &&
          new Date(r.target_updated_at).getTime() === mine.updated_at.getTime(),
      ) ?? null
    )
  }, [mySignal.data, reactions.data, user])

  const sent = useMemo(() => {
    const theirs = partnerSignal.data
    if (!theirs || !user) return null
    return (
      reactions.data?.find(
        (r) =>
          r.from_user_id === user.id &&
          r.to_user_id === theirs.user_id &&
          new Date(r.target_updated_at).getTime() === theirs.updated_at.getTime(),
      ) ?? null
    )
  }, [partnerSignal.data, reactions.data, user])

  const mismatchCopy = useMemo(() => {
    const mine = mySignal.data
    const theirs = partnerSignal.data
    if (!mine || !theirs || partnerMember?.sharing_paused) return null
    const pair = [mine.preset, theirs.preset]
    if (!(pair.includes('bad_cooldown') && pair.includes('bad_talk_now'))) {
      return null
    }
    const cooldownIsPartner = theirs.preset === 'bad_cooldown'
    const name = cooldownIsPartner
      ? (partnerProfile.data?.nickname || 'パートナー')
      : (profile.data?.nickname || 'あなた')
    return `お互いのペースが違うようです。${name}さんの『戻る目安』まで少し待って、そのあと話せそうか伝えましょう`
  }, [
    mySignal.data,
    partnerSignal.data,
    partnerMember?.sharing_paused,
    partnerProfile.data?.nickname,
    profile.data?.nickname,
  ])

  async function writeSignal(input: {
    presetId: PresetId
    note: string | null
    revisitAt: Date | null
    extendCount: number
    requestTags?: MappedTags
  }) {
    if (!user || !coupleId) return
    const sentAt = new Date()
    await upsertSignal({
      userId: user.id,
      coupleId,
      presetId: input.presetId,
      requestTags: input.requestTags ?? mySignal.data?.request_tags ?? [],
      note: input.note,
      revisitAt: input.revisitAt,
      expiresAt: computeExpiresAt(input.presetId, sentAt, input.revisitAt),
      extendCount: input.extendCount,
    })
    await queryClient.invalidateQueries({ queryKey: ['signal'] })
  }

  type MappedTags = NonNullable<typeof mySignal.data>['request_tags']

  const reactMut = useMutation({
    mutationFn: async (kind: ReactionKind) => {
      if (!user || !coupleId || !partnerSignal.data) return
      await sendReaction({
        coupleId,
        fromUserId: user.id,
        toUserId: partnerSignal.data.user_id,
        kind,
        targetUpdatedAt: partnerSignal.data.updated_at,
      })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reactions'] }),
  })

  const canReact =
    Boolean(partnerSignal.data) && !partnerMember?.sharing_paused

  return (
    <div className="flex min-h-[calc(100dvh-5rem)] flex-col px-5 pb-6 pt-5">
      <header className="mb-4">
        <p className="text-sm text-sage">Kimoti</p>
        <h1 className="text-lg font-medium">
          {partnerProfile.data?.nickname
            ? `${partnerProfile.data.nickname}さんのいま`
            : '相手のいま'}
        </h1>
      </header>

      <SignalView
        signal={partnerMember?.sharing_paused ? null : (partnerSignal.data ?? null)}
        now={now}
        sharingPaused={partnerMember?.sharing_paused}
        emptyLabel="まだ合図はありません"
      />

      {mismatchCopy ? (
        <p className="mt-4 rounded-2xl bg-card px-4 py-3 text-sm leading-relaxed text-muted">
          {mismatchCopy}
        </p>
      ) : null}

      {received ? (
        <p className="mt-3 text-sm text-sage-deep">
          {partnerProfile.data?.nickname ?? 'パートナー'}さんから「
          {REACTION_LABELS[received.kind]}」
        </p>
      ) : null}

      {canReact ? (
        <div className="mt-5 grid grid-cols-3 gap-2">
          {REACTION_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => reactMut.mutate(kind)}
              className={`min-h-11 rounded-2xl px-2 text-xs ${
                sent?.kind === kind
                  ? 'bg-sage text-white'
                  : 'bg-card text-ink border border-line'
              }`}
            >
              {REACTION_LABELS[kind]}
            </button>
          ))}
        </div>
      ) : null}

      <section className="mt-8">
        <h2 className="mb-2 text-sm text-muted">自分のいま</h2>
        <SignalView signal={mySignal.data ?? null} now={now} size="small" />
      </section>

      <div className="mt-auto pt-6">
        <Link
          to="/signal"
          className="flex min-h-14 w-full items-center justify-center rounded-3xl bg-sage text-base font-medium text-white shadow-sm"
        >
          合図を変更する
        </Link>
      </div>

      <Modal
        open={prompt.open && !extendOpen}
        title="約束の時間になりました。話せそうですか？"
        onClose={prompt.dismiss}
      >
        <div className="space-y-2">
          <Button
            type="button"
            onClick={() => {
              void writeSignal({
                presetId: 'normal',
                note: null,
                revisitAt: null,
                extendCount: 0,
                requestTags: [],
              }).then(prompt.dismiss)
            }}
          >
            話せそう
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setExtendOpen(true)}
          >
            もう少し待って
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const revisitAt = revisitFromPicker('today', '', new Date())
              const presetId: PresetId =
                mySignal.data && SIGNAL_PRESETS[mySignal.data.preset].availability === 'wait'
                  ? mySignal.data.preset
                  : 'busy'
              void writeSignal({
                presetId,
                note: REST_OF_DAY_NOTE,
                revisitAt,
                extendCount: mySignal.data?.extend_count ?? 0,
              }).then(prompt.dismiss)
            }}
          >
            今日は話さない
          </Button>
        </div>
      </Modal>

      <Modal
        open={extendOpen}
        title="いつごろ、また様子を伝えますか？"
        onClose={() => setExtendOpen(false)}
      >
        {shouldShowExtendTalkNudge((mySignal.data?.extend_count ?? 0) + 1) ? (
          <p className="mb-4 text-sm leading-relaxed text-muted">
            少し話してみませんか？ もちろん、まだ待っても大丈夫です。
          </p>
        ) : null}
        <RevisitPicker
          selected={revisitOption}
          onSelect={setRevisitOption}
          customLocal={customLocal}
          onCustomLocal={setCustomLocal}
          requireDeadline
        />
        <Button
          className="mt-4"
          type="button"
          onClick={() => {
            const revisitAt = revisitFromPicker(revisitOption, customLocal, new Date())
            if (!revisitAt || !mySignal.data) return
            void writeSignal({
              presetId: mySignal.data.preset,
              note: mySignal.data.note,
              revisitAt,
              extendCount: mySignal.data.extend_count + 1,
            }).then(() => {
              setExtendOpen(false)
              prompt.dismiss()
            })
          }}
        >
          目安を延ばす
        </Button>
      </Modal>
    </div>
  )
}
