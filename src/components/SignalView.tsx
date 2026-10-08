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
        className="rounded-3xl bg-card px-5 py-7 text-center shadow-sm"
        style={{ opacity: 0.7 }}
      >
        <p className="text-xl text-fog">状態不明</p>
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

  return (
    <div
      className="rounded-3xl bg-card px-5 py-6 shadow-sm"
      style={{ opacity: freshnessOpacity(status) }}
    >
      <div className="flex items-start gap-3">
        <span className={large ? 'text-4xl' : 'text-2xl'} aria-hidden>
          {preset.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className={large ? 'text-xl font-medium leading-snug' : 'text-base font-medium'}>
            {preset.label}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {formatRevisitMessage(signal.revisit_at)}
          </p>
          {status === 'overdue' ? (
            <p className="mt-2 text-sm text-muted">約束の時間を過ぎています</p>
          ) : null}
        </div>
      </div>
      {signal.request_tags.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {signal.request_tags.map((tag: RequestTag) => (
            <span
              key={tag}
              className="rounded-full bg-paper px-3 py-1 text-xs text-muted"
            >
              {REQUEST_TAG_LABELS[tag]}
            </span>
          ))}
        </div>
      ) : null}
      {signal.note ? (
        <p className="mt-3 text-sm leading-relaxed text-ink">{signal.note}</p>
      ) : null}
      <p className="mt-4 text-xs text-fog">{formatUpdatedAgo(signal.updated_at, now)}</p>
    </div>
  )
}
