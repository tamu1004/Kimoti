import {
  expandPreset,
  type PresetId,
  type RequestTag,
} from '../domain/signals'
import { isSupabaseConfigured, supabase } from './client'
import { mapSignalRow, toIso, type MappedSignal } from './mappers'

function localSignalKey(userId: string) {
  return `kimoti.dev.signal.${userId}`
}

function localLogKey(userId: string) {
  return `kimoti.dev.signalLogs.${userId}`
}

export async function fetchCurrentSignal(
  userId: string,
): Promise<MappedSignal | null> {
  if (!isSupabaseConfigured || !supabase) {
    const raw = localStorage.getItem(localSignalKey(userId))
    if (!raw) return null
    const value = JSON.parse(raw)
    return {
      ...value,
      request_tags: value.request_tags ?? [],
      note: value.note ?? null,
      user_id: value.user_id,
      updated_at: new Date(value.updated_at),
      expires_at: new Date(value.expires_at),
      revisit_at: value.revisit_at ? new Date(value.revisit_at) : null,
    }
  }

  const { data, error } = await supabase
    .from('current_signals')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data ? mapSignalRow(data) : null
}

export async function fetchMySignalLogs(userId: string): Promise<MappedSignal[]> {
  if (!isSupabaseConfigured || !supabase) {
    const raw = localStorage.getItem(localLogKey(userId))
    const logs = raw ? JSON.parse(raw) : []
    return logs.map((row: any) => ({
      ...row,
      request_tags: row.request_tags ?? [],
      note: row.note ?? null,
      updated_at: new Date(row.updated_at ?? row.created_at),
      expires_at: new Date(row.expires_at),
      revisit_at: row.revisit_at ? new Date(row.revisit_at) : null,
    }))
  }

  const { data, error } = await supabase
    .from('signal_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) throw error
  return (data ?? []).map(mapSignalRow)
}

export type UpsertSignalInput = {
  userId: string
  coupleId: string
  presetId: PresetId
  requestTags: RequestTag[]
  note: string | null
  revisitAt: Date | null
  expiresAt: Date
  extendCount: number
}

export async function upsertSignal(input: UpsertSignalInput) {
  const expanded = expandPreset(input.presetId, {
    request_tags: input.requestTags,
    note: input.note,
  })
  if (!isSupabaseConfigured || !supabase) {
    const next = {
      user_id: input.userId,
      couple_id: input.coupleId,
      preset: expanded.preset,
      mood: expanded.mood,
      availability: expanded.availability,
      cause: expanded.cause,
      request_tags: expanded.request_tags,
      note: expanded.note,
      revisit_at: input.revisitAt ? toIso(input.revisitAt) : null,
      expires_at: toIso(input.expiresAt),
      extend_count: input.extendCount,
      updated_at: toIso(new Date()),
    }
    localStorage.setItem(localSignalKey(input.userId), JSON.stringify(next))
    const logs = JSON.parse(localStorage.getItem(localLogKey(input.userId)) ?? '[]')
    logs.unshift({
      ...next,
      created_at: new Date().toISOString(),
    })
    localStorage.setItem(localLogKey(input.userId), JSON.stringify(logs.slice(0, 50)))
    return
  }

  const { error } = await supabase.from('current_signals').upsert({
    user_id: input.userId,
    couple_id: input.coupleId,
    preset: expanded.preset,
    mood: expanded.mood,
    availability: expanded.availability,
    cause: expanded.cause,
    request_tags: expanded.request_tags,
    note: expanded.note,
    revisit_at: input.revisitAt ? toIso(input.revisitAt) : null,
    expires_at: toIso(input.expiresAt),
    extend_count: input.extendCount,
    updated_at: toIso(new Date()),
  })
  if (error) throw error
}
