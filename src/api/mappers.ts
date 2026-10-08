import {
  isPresetId,
  type Availability,
  type Cause,
  type Mood,
  type PresetId,
  type ReactionKind,
  type RequestTag,
  type SignalRecord,
} from '../domain/signals'
import type { Database } from './database'

export type CurrentSignalRow = Database['public']['Tables']['current_signals']['Row']
export type SignalLogRow = Database['public']['Tables']['signal_logs']['Row']
export type ReactionRow = Database['public']['Tables']['reactions']['Row']

export type MappedSignal = SignalRecord & {
  user_id: string
  couple_id: string
}

export function parseDate(value: string): Date {
  return new Date(value)
}

export function toIso(value: Date): string {
  return value.toISOString()
}

export function mapSignalRow(row: CurrentSignalRow | SignalLogRow): MappedSignal {
  const preset: PresetId = isPresetId(row.preset) ? row.preset : 'normal'
  return {
    user_id: row.user_id,
    couple_id: row.couple_id,
    preset,
    mood: row.mood as Mood,
    availability: row.availability as Availability,
    cause: (row.cause as Cause | null) ?? null,
    request_tags: (row.request_tags ?? []) as RequestTag[],
    note: row.note,
    revisit_at: row.revisit_at ? parseDate(row.revisit_at) : null,
    expires_at: parseDate(row.expires_at),
    extend_count: row.extend_count,
    updated_at:
      'updated_at' in row
        ? parseDate(row.updated_at)
        : parseDate(row.created_at),
  }
}

export function mapReactionKind(kind: string): ReactionKind {
  if (kind === 'ok' || kind === 'waiting' || kind === 'take_your_time') {
    return kind
  }
  return 'ok'
}

export function rpcMessage(error: { message: string } | null): string {
  const raw = error?.message ?? ''
  if (raw.includes('invalid code')) return '招待コードが見つかりません'
  if (raw.includes('code expired')) return '招待コードの期限が切れています'
  if (raw.includes('code already used')) return 'この招待コードはすでに使われています'
  if (raw.includes('couple is full')) return 'このペアはすでに2人です'
  if (raw.includes('already paired')) return 'すでにペアに参加しています'
  if (raw.includes('cannot join own invite')) return '自分の招待コードでは参加できません'
  if (raw.includes('not authenticated')) return 'ログインし直してください'
  return raw || 'うまくいきませんでした。少し待ってからもう一度どうぞ'
}
