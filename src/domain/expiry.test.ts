import { addHours, addMinutes, subHours } from 'date-fns'
import { describe, expect, it } from 'vitest'
import {
  computeExpiresAt,
  computeRevisitAt,
  DEFAULT_SIGNAL_HOURS,
  formatRevisitMessage,
  formatUpdatedAgo,
  getSignalStatus,
  isRevisitRequiredSatisfied,
  NEGATIVE_WITH_REVISIT_GRACE_HOURS,
  NEGATIVE_WITHOUT_REVISIT_HOURS,
  shouldShowExtendTalkNudge,
} from './expiry'
import type { SignalRecord } from './signals'

function signal(
  partial: Partial<SignalRecord> & Pick<SignalRecord, 'expires_at'>,
): Pick<SignalRecord, 'expires_at' | 'revisit_at'> {
  return {
    expires_at: partial.expires_at,
    revisit_at: partial.revisit_at ?? null,
  }
}

describe('computeExpiresAt', () => {
  const sentAt = new Date('2026-10-03T10:00:00')

  it('uses 12 hours for good / normal style presets', () => {
    expect(computeExpiresAt('good', sentAt, null)).toEqual(
      addHours(sentAt, DEFAULT_SIGNAL_HOURS),
    )
    expect(computeExpiresAt('busy', sentAt, addHours(sentAt, 1))).toEqual(
      addHours(sentAt, DEFAULT_SIGNAL_HOURS),
    )
  })

  it('uses 6 hours for negative signals without a revisit time', () => {
    expect(computeExpiresAt('bad_down', sentAt, null)).toEqual(
      addHours(sentAt, NEGATIVE_WITHOUT_REVISIT_HOURS),
    )
  })

  it('uses revisit_at + 2 hours for negative signals with a deadline', () => {
    const revisit = addHours(sentAt, 1)
    expect(computeExpiresAt('bad_cooldown', sentAt, revisit)).toEqual(
      addHours(revisit, NEGATIVE_WITH_REVISIT_GRACE_HOURS),
    )
  })
})

describe('computeRevisitAt', () => {
  const now = new Date('2026-10-03T15:00:00')

  it('adds 30 minutes / 1 hour / 2 hours', () => {
    expect(computeRevisitAt({ optionId: 'm30' }, now)).toEqual(
      addMinutes(now, 30),
    )
    expect(computeRevisitAt({ optionId: 'h1' }, now)).toEqual(addHours(now, 1))
    expect(computeRevisitAt({ optionId: 'h2' }, now)).toEqual(addHours(now, 2))
  })

  it('uses 23:59 local time for 今日中', () => {
    const result = computeRevisitAt({ optionId: 'today' }, now)
    expect(result?.getHours()).toBe(23)
    expect(result?.getMinutes()).toBe(59)
    expect(result?.getDate()).toBe(3)
  })

  it('returns null for 未定', () => {
    expect(computeRevisitAt({ optionId: 'undecided' }, now)).toBeNull()
  })

  it('caps custom times at 24 hours', () => {
    const tooFar = addHours(now, 30)
    expect(computeRevisitAt({ optionId: 'custom', at: tooFar }, now)).toEqual(
      addHours(now, 24),
    )
  })
})

describe('getSignalStatus', () => {
  const now = new Date('2026-10-03T12:00:00')

  it('returns unknown when there is no signal', () => {
    expect(getSignalStatus(null, now)).toBe('unknown')
  })

  it('returns unknown when now >= expires_at', () => {
    expect(
      getSignalStatus(
        signal({
          expires_at: now,
          revisit_at: addHours(now, 1),
        }),
        now,
      ),
    ).toBe('unknown')
    expect(
      getSignalStatus(
        signal({
          expires_at: subHours(now, 1),
          revisit_at: null,
        }),
        now,
      ),
    ).toBe('unknown')
  })

  it('returns overdue when revisit_at < now < expires_at', () => {
    expect(
      getSignalStatus(
        signal({
          revisit_at: subHours(now, 1),
          expires_at: addHours(now, 2),
        }),
        now,
      ),
    ).toBe('overdue')
  })

  it('returns active when still within expiry and before revisit_at', () => {
    expect(
      getSignalStatus(
        signal({
          revisit_at: addHours(now, 1),
          expires_at: addHours(now, 3),
        }),
        now,
      ),
    ).toBe('active')
  })

  it('returns active when revisit_at is unset and not expired', () => {
    expect(
      getSignalStatus(
        signal({
          revisit_at: null,
          expires_at: addHours(now, 6),
        }),
        now,
      ),
    ).toBe('active')
  })
})

describe('copy helpers', () => {
  it('formats a revisit as a gentle estimate', () => {
    expect(formatRevisitMessage(new Date('2026-10-03T20:30:00'))).toBe(
      '20:30ごろにまた様子を伝えるね',
    )
    expect(formatRevisitMessage(null)).toBe(
      '落ち着いたら自分から様子を伝えるね',
    )
  })

  it('formats relative update time', () => {
    const now = new Date('2026-10-03T12:00:00')
    expect(formatUpdatedAgo(addMinutes(now, -5), now)).toBe('5分前に更新')
  })

  it('shows the talk nudge after two extensions', () => {
    expect(shouldShowExtendTalkNudge(1)).toBe(false)
    expect(shouldShowExtendTalkNudge(2)).toBe(true)
  })

  it('requires a deadline for bad_cooldown', () => {
    expect(isRevisitRequiredSatisfied('bad_cooldown', null)).toBe(false)
    expect(
      isRevisitRequiredSatisfied('bad_cooldown', new Date()),
    ).toBe(true)
    expect(isRevisitRequiredSatisfied('good', null)).toBe(true)
  })
})
