import { addHours, addMinutes, differenceInMinutes, format, set } from 'date-fns'
import {
  isNegativePreset,
  MAX_REVISIT_HOURS,
  SIGNAL_PRESETS,
  type PresetId,
  type RevisitOptionId,
  type SignalRecord,
} from './signals'

/** Hours added after revisit_at for negative signals. */
export const NEGATIVE_WITH_REVISIT_GRACE_HOURS = 2
/** Hours after send when a negative signal has no revisit_at. */
export const NEGATIVE_WITHOUT_REVISIT_HOURS = 6
/** Hours after send for good / normal / tired / busy and similar. */
export const DEFAULT_SIGNAL_HOURS = 12

export type SignalStatus = 'active' | 'overdue' | 'unknown'

export type RevisitChoice =
  | { optionId: Exclude<RevisitOptionId, 'custom' | 'undecided'> }
  | { optionId: 'undecided' }
  | { optionId: 'custom'; at: Date }

export function computeExpiresAt(
  presetId: PresetId,
  sentAt: Date,
  revisitAt: Date | null,
): Date {
  if (isNegativePreset(presetId)) {
    if (revisitAt) {
      return addHours(revisitAt, NEGATIVE_WITH_REVISIT_GRACE_HOURS)
    }
    return addHours(sentAt, NEGATIVE_WITHOUT_REVISIT_HOURS)
  }
  return addHours(sentAt, DEFAULT_SIGNAL_HOURS)
}

export function endOfLocalDay(now: Date): Date {
  return set(now, { hours: 23, minutes: 59, seconds: 0, milliseconds: 0 })
}

export function maxRevisitAt(now: Date): Date {
  return addHours(now, MAX_REVISIT_HOURS)
}

export function computeRevisitAt(
  choice: RevisitChoice,
  now: Date,
): Date | null {
  let raw: Date | null
  switch (choice.optionId) {
    case 'm30':
      raw = addMinutes(now, 30)
      break
    case 'h1':
      raw = addHours(now, 1)
      break
    case 'h2':
      raw = addHours(now, 2)
      break
    case 'today':
      raw = endOfLocalDay(now)
      break
    case 'undecided':
      raw = null
      break
    case 'custom':
      raw = choice.at
      break
  }

  if (!raw) return null
  const cap = maxRevisitAt(now)
  return raw > cap ? cap : raw
}

export function getSignalStatus(
  signal: Pick<SignalRecord, 'expires_at' | 'revisit_at'> | null,
  now: Date,
): SignalStatus {
  if (!signal) return 'unknown'
  if (now.getTime() >= signal.expires_at.getTime()) return 'unknown'
  if (signal.revisit_at && now.getTime() > signal.revisit_at.getTime()) {
    return 'overdue'
  }
  return 'active'
}

export function formatRevisitMessage(revisitAt: Date | null): string {
  if (!revisitAt) return '落ち着いたら自分から様子を伝えるね'
  return `${format(revisitAt, 'H:mm')}ごろにまた様子を伝えるね`
}

export function formatUpdatedAgo(updatedAt: Date, now: Date): string {
  const minutes = Math.max(0, differenceInMinutes(now, updatedAt))
  if (minutes < 1) return 'たった今更新'
  if (minutes < 60) return `${minutes}分前に更新`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}時間前に更新`
  const days = Math.floor(hours / 24)
  return `${days}日前に更新`
}

export function formatUnknownLastUpdate(updatedAt: Date, now: Date): string {
  const minutes = Math.max(0, differenceInMinutes(now, updatedAt))
  if (minutes < 60) return `最終更新: ${Math.max(1, minutes)}分前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `最終更新: ${hours}時間前`
  const days = Math.floor(hours / 24)
  return `最終更新: ${days}日前`
}

export function shouldShowExtendTalkNudge(extendCount: number): boolean {
  return extendCount >= 2
}

export function isRevisitRequiredSatisfied(
  presetId: PresetId,
  revisitAt: Date | null,
): boolean {
  const preset = SIGNAL_PRESETS[presetId]
  if (!preset.revisitRequired) return true
  return revisitAt !== null
}

export function freshnessOpacity(status: SignalStatus): number {
  if (status === 'unknown') return 0.45
  if (status === 'overdue') return 0.72
  return 1
}

export const REVISIT_OPTION_LABELS: Record<RevisitOptionId, string> = {
  m30: '30分',
  h1: '1時間',
  h2: '2時間',
  today: '今日中',
  undecided: '未定（落ち着いたら自分から）',
  custom: '時刻を指定',
}

export const REST_OF_DAY_NOTE = '今日はお休みします。明日また様子を伝えるね'
export const READY_TO_TALK_HINT = '話せそうになりました'
