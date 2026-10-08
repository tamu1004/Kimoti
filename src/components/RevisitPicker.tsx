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
      <p className="text-sm text-muted">戻る目安</p>
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
                  ? 'bg-sage text-white'
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
