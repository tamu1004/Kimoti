import {
  formatRevisitMessage,
  formatUnknownLastUpdate,
  formatUpdatedAgo,
  freshnessOpacity,
  getSignalStatus,
  type SignalStatus,
} from '../domain/expiry'
import {
  REQUEST_TAG_LABELS,
  SIGNAL_PRESETS,
  type RequestTag,
  type SignalRecord,
} from '../domain/signals'

export function SignalView({
  signal,
  now,
  sharingPaused,
  emptyLabel,
  size = 'large',
}: {
  signal: SignalRecord | null
  now: Date
  sharingPaused?: boolean
  emptyLabel?: string
  size?: 'large' | 'small'
}) {
  if (sharingPaused) {
    return (
      <div className="rounded-3xl bg-card px-5 py-8 text-center shadow-sm">
        <p className="text-lg text-muted">共有を一時停止中</p>
      </div>
    )
  }

  const status: SignalStatus = getSignalStatus(signal, now)

  if (!signal || status === 'unknown') {
    return (
      <div
        className="rounded-[1.4rem] border border-line bg-card px-5 py-6"
        style={{ opacity: 0.7 }}
      >
        <p className="text-xs font-medium text-muted">いまの合図</p>
        <p className="mt-2 text-xl font-medium text-fog">状態不明</p>
        {signal ? (
          <>
            <p className="mt-2 text-sm text-muted">
              {formatUnknownLastUpdate(signal.updated_at, now)}
            </p>
            <p className="mt-3 text-sm text-fog">
              {SIGNAL_PRESETS[signal.preset].emoji}{' '}
              {SIGNAL_PRESETS[signal.preset].label}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {emptyLabel ?? 'まだ合図はありません'}
          </p>
        )}
      </div>
    )
  }

  const preset = SIGNAL_PRESETS[signal.preset]
  const large = size === 'large'
  const toneColor =
    preset.tone === 'positive'
      ? 'bg-[#edf5e9]'
      : preset.tone === 'negative'
        ? 'bg-[#fbefeb]'
        : 'bg-[#eaf3f2]'

  return (
    <div
      className={`rounded-[1.4rem] border border-line bg-card ${large ? 'p-5' : 'p-4'}`}
      style={{ opacity: freshnessOpacity(status) }}
    >
      <div className="flex items-start gap-4">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full ${toneColor} ${large ? 'size-16 text-4xl' : 'size-11 text-2xl'}`}
          aria-hidden
        >
          {preset.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">いまの気持ち</p>
          <p className={`mt-1 font-medium leading-snug ${large ? 'text-xl' : 'text-base'}`}>
            {preset.label}
          </p>
          {signal.revisit_at ? (
            <p className="mt-3 text-sm leading-relaxed text-ink">
              {formatRevisitMessage(signal.revisit_at)}
            </p>
          ) : signal.preset === 'good' || signal.preset === 'happy_talk' ? null : (
            <p className="mt-3 text-sm leading-relaxed text-ink">
              また話し合う時間は決めていません
            </p>
          )}
          {status === 'overdue' ? (
            <p className="mt-2 text-sm font-medium text-peach">目安の時間を過ぎています。今の気持ちを更新できます。</p>
          ) : null}
        </div>
      </div>
      {signal.request_tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {signal.request_tags.map((tag: RequestTag) => (
            <span
              key={tag}
              className="rounded-full border border-line bg-paper px-3 py-1 text-xs text-muted"
            >
              {REQUEST_TAG_LABELS[tag]}
            </span>
          ))}
        </div>
      ) : null}
      {signal.note ? (
        <p className="mt-3 text-sm leading-relaxed text-ink">{signal.note}</p>
      ) : null}
      <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
        {formatUpdatedAgo(signal.updated_at, now)}
      </p>
    </div>
  )
}
