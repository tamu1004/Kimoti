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
    return `お互いのペースが違うようです。${name}さんが決めた「もう一度話し合う目安」まで待って、そのあと話せそうか伝えましょう`
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
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold tracking-[0.16em] text-sage-deep">KIMOTI</p>
          <p className="mt-0.5 text-xs text-muted">ふたりの会話の合図</p>
        </div>
        <span className="rounded-full border border-line bg-card px-3 py-1 text-xs text-muted">
          ふたりだけ
        </span>
      </header>

      <section className="mb-6 mt-7">
        <p className="text-xs font-medium text-sage-deep">話すタイミングを、一緒に。</p>
        <h1 className="mt-2 text-[1.65rem] font-medium leading-snug">
          気持ちを知って、<br />
          話せる頃を待ち合わせ。
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          合図は会話の代わりではなく、ちゃんと話すためのきっかけです。
        </p>
      </section>

      <section aria-labelledby="partner-signal-heading">
        <div className="mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-peach" aria-hidden="true" />
          <h2 id="partner-signal-heading" className="text-sm font-medium">
          {partnerProfile.data?.nickname
              ? `${partnerProfile.data.nickname}さんから届いた合図`
              : 'パートナーから届いた合図'}
          </h2>
        </div>

        <SignalView
          signal={partnerMember?.sharing_paused ? null : (partnerSignal.data ?? null)}
          now={now}
          sharingPaused={partnerMember?.sharing_paused}
          emptyLabel="合図が届くと、ここに表示されます"
        />
      </section>

      {mismatchCopy ? (
        <p className="mt-4 rounded-2xl border border-peach/30 bg-[#fbefeb] px-4 py-3 text-sm leading-relaxed text-ink">
          {mismatchCopy}
        </p>
      ) : null}

      {received ? (
        <p className="mt-3 rounded-xl bg-[#e5f0e9] px-3 py-2 text-sm text-sage-deep" role="status">
          {partnerProfile.data?.nickname ?? 'パートナー'}さんに「
          {REACTION_LABELS[received.kind]}」を受け取りました
        </p>
      ) : null}

      {canReact ? (
        <section className="mt-5" aria-label="パートナーへのリアクション">
          <p className="mb-2 text-xs text-muted">受け取ったことを伝える</p>
          <div className="grid grid-cols-3 gap-2">
            {REACTION_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => reactMut.mutate(kind)}
                aria-pressed={sent?.kind === kind}
                className={`min-h-11 rounded-xl border px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage ${
                  sent?.kind === kind
                    ? 'border-sage bg-sage text-white'
                    : 'border-line bg-card text-ink hover:border-sage/60'
                }`}
              >
                {REACTION_LABELS[kind]}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7" aria-labelledby="my-signal-heading">
        <div className="mb-3 flex items-center gap-2">
          <span className="size-2 rounded-full bg-sage" aria-hidden="true" />
          <h2 id="my-signal-heading" className="text-sm font-medium">あなたからの合図</h2>
        </div>
        <SignalView signal={mySignal.data ?? null} now={now} size="small" />
      </section>

      <div className="mt-auto pt-6">
        <Link
          to="/signal"
          className="flex min-h-14 w-full items-center justify-center rounded-2xl bg-sage-deep px-5 text-base font-medium text-white shadow-[0_8px_18px_rgba(40,88,78,0.18)] transition-colors hover:bg-sage focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage"
        >
          {mySignal.data ? '自分の合図を更新する' : '自分の気持ちを伝える'}
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
