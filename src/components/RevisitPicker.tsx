import { computeRevisitAt, REVISIT_OPTION_LABELS } from '../domain/expiry'
import {
  REVISIT_OPTION_IDS,
  type RevisitOptionId,
} from '../domain/signals'

const OPTIONS: RevisitOptionId[] = [
  'm30',
  'h1',
  'h2',
  'today',
  'undecided',
  'custom',
]

export function RevisitPicker({
  selected,
  onSelect,
  customLocal,
  onCustomLocal,
  requireDeadline,
}: {
  selected: RevisitOptionId
  onSelect: (id: RevisitOptionId) => void
  customLocal: string
  onCustomLocal: (value: string) => void
  requireDeadline?: boolean
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-ink">もう一度話し合う目安</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">
          話せそうな時間を決めておくための目安です。約束ではなく、あとで変更できます。
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {OPTIONS.map((id) => {
          if (requireDeadline && id === 'undecided') return null
          const active = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelect(id)}
              className={`min-h-11 rounded-2xl px-3 text-left text-sm ${
                active
                  ? 'border border-aurora-teal/60 bg-aurora-teal text-aurora-deep shadow-[0_0_18px_rgba(45,212,191,0.16)]'
                  : 'bg-paper text-ink border border-line'
              }`}
            >
              {REVISIT_OPTION_LABELS[id]}
            </button>
          )
        })}
      </div>
      {selected === 'custom' ? (
        <input
          type="datetime-local"
          value={customLocal}
          onChange={(e) => onCustomLocal(e.target.value)}
          className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 text-sm outline-none focus:border-sage"
        />
      ) : null}
    </div>
  )
}

export function revisitFromPicker(
  selected: RevisitOptionId,
  customLocal: string,
  now: Date,
) {
  if (selected === 'custom') {
    if (!customLocal) return null
    return computeRevisitAt({ optionId: 'custom', at: new Date(customLocal) }, now)
  }
  if (selected === 'undecided') {
    return computeRevisitAt({ optionId: 'undecided' }, now)
  }
  const ids = REVISIT_OPTION_IDS.filter(
    (id) => id !== 'custom' && id !== 'undecided',
  )
  if (ids.includes(selected)) {
    return computeRevisitAt(
      { optionId: selected as Exclude<RevisitOptionId, 'custom' | 'undecided'> },
      now,
    )
  }
  return null
}
