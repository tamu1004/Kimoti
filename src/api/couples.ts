import { getLocalDevUserId, isSupabaseConfigured, supabase } from './client'
import { rpcMessage } from './mappers'

export type Profile = {
  id: string
  nickname: string
  created_at: string
}

export type Membership = {
  couple_id: string
  user_id: string
  sharing_paused: boolean
  joined_at: string
}

function localRead<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function localWrite<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function localProfileKey(userId: string) {
  return `kimoti.dev.profile.${userId}`
}

function localMembershipKey(userId: string) {
  return `kimoti.dev.membership.${userId}`
}

function localCoupleKey(coupleId: string) {
  return `kimoti.dev.couple.${coupleId}`
}

export function normalizeInviteCode(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    const parsed = new URL(trimmed)
    const code = parsed.searchParams.get('code')
    if (code) return normalizeInviteCode(code)
  } catch {
    // plain code or partially pasted URL
  }

  const out = trimmed
    .toUpperCase()
    .replace(/^LOCAL[-_]?/i, '')
    .replace(/^HTTPS?:\/\//i, '')
    .replace(/^\//, '')
    .replace(/.*[?&]CODE=/i, '')
    .replace(/[^A-Z0-9]/g, '')

  return out.slice(0, 8)
}

function localInviteKey(code: string) {
  return `kimoti.dev.invite.${code}`
}

function localListInviteKeys() {
  const keys: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith('kimoti.dev.invite.')) keys.push(key)
  }
  return keys
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured || !supabase) {
    const profile = localRead<Profile>(localProfileKey(userId))
    if (profile) return profile
    return {
      id: userId,
      nickname: 'ローカルユーザー',
      created_at: new Date().toISOString(),
    }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertNickname(userId: string, nickname: string) {
  if (!isSupabaseConfigured || !supabase) {
    const profile = {
      id: userId,
      nickname,
      created_at: new Date().toISOString(),
    }
    localWrite(localProfileKey(userId), profile)
    return
  }

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, nickname })
  if (error) throw error
}

export async function fetchMyMembership(
  userId: string,
): Promise<Membership | null> {
  if (!isSupabaseConfigured || !supabase) {
    return localRead<Membership>(localMembershipKey(userId))
  }

  const { data, error } = await supabase
    .from('couple_members')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function fetchCoupleMembers(
  coupleId: string,
): Promise<Membership[]> {
  if (!isSupabaseConfigured || !supabase) {
    return localRead<Membership[]>(localCoupleKey(coupleId)) ?? []
  }

  const { data, error } = await supabase
    .from('couple_members')
    .select('*')
    .eq('couple_id', coupleId)
  if (error) throw error
  return data ?? []
}

export async function createInviteCode(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const userId = getLocalDevUserId()
    const savedMembership = localRead<Membership>(localMembershipKey(userId))
    const coupleId = savedMembership?.couple_id ?? crypto.randomUUID()
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    let inviteCode = ''
    for (let i = 0; i < 8; i += 1) {
      inviteCode += chars[Math.floor(Math.random() * chars.length)]
    }
    if (!savedMembership) {
      const membership: Membership = {
        couple_id: coupleId,
        user_id: userId,
        sharing_paused: false,
        joined_at: new Date().toISOString(),
      }
      localWrite(localMembershipKey(userId), membership)
      localWrite(localCoupleKey(coupleId), [membership])
    }
    localWrite(localInviteKey(inviteCode), {
      code: inviteCode,
      couple_id: coupleId,
      created_by: userId,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      used_at: null,
    })
    return inviteCode
  }

  const { data, error } = await supabase.rpc('create_invite')
  if (error) throw new Error(rpcMessage(error))
  return data
}

export async function joinCouple(code: string): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    const userId = getLocalDevUserId()
    const normalized = normalizeInviteCode(code)
    const invite = localListInviteKeys()
      .map((key) => localRead<{ code: string; couple_id: string; used_at: string | null }>(key))
      .find((value) => value?.code === normalized)

    if (!invite) throw new Error('invalid code')
    if (invite.used_at) throw new Error('code already used')

    const membership: Membership = {
      couple_id: invite.couple_id,
      user_id: userId,
      sharing_paused: false,
      joined_at: new Date().toISOString(),
    }
    localWrite(localMembershipKey(userId), membership)
    const coupleMembers = localRead<Membership[]>(localCoupleKey(invite.couple_id)) ?? []
    const merged = [...coupleMembers.filter((item) => item.user_id !== userId), membership]
    localWrite(localCoupleKey(invite.couple_id), merged)
    const codeKey = normalizeInviteCode(code)
    localWrite(localInviteKey(codeKey), {
      ...invite,
      used_at: new Date().toISOString(),
    })
    return invite.couple_id
  }

  const { data, error } = await supabase.rpc('join_couple', { code })
  if (error) throw new Error(rpcMessage(error))
  return data
}

export async function setSharingPaused(userId: string, paused: boolean) {
  if (!isSupabaseConfigured || !supabase) {
    const membership = localRead<Membership>(localMembershipKey(userId))
    if (!membership) return
    const next = { ...membership, sharing_paused: paused }
    localWrite(localMembershipKey(userId), next)
    const coupleMembers = localRead<Membership[]>(localCoupleKey(membership.couple_id)) ?? []
    localWrite(
      localCoupleKey(membership.couple_id),
      coupleMembers.map((member) =>
        member.user_id === userId ? next : member,
      ),
    )
    return
  }

  const { error } = await supabase
    .from('couple_members')
    .update({ sharing_paused: paused })
    .eq('user_id', userId)
  if (error) throw error
}

export async function leaveCouple() {
  if (!isSupabaseConfigured || !supabase) {
    const userId = getLocalDevUserId()
    const membership = localRead<Membership>(localMembershipKey(userId))
    if (!membership) return
    localStorage.removeItem(localMembershipKey(userId))
    const coupleMembers = localRead<Membership[]>(localCoupleKey(membership.couple_id)) ?? []
    localWrite(
      localCoupleKey(membership.couple_id),
      coupleMembers.filter((member) => member.user_id !== userId),
    )
    return
  }

  const { error } = await supabase.rpc('leave_couple')
  if (error) throw new Error(rpcMessage(error))
}

export async function deleteMyAccount() {
  if (!isSupabaseConfigured || !supabase) {
    const userId = getLocalDevUserId()
    localStorage.removeItem(localProfileKey(userId))
    localStorage.removeItem(localMembershipKey(userId))
    sessionStorage.removeItem('kimoti.dev.userId')
    return
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) throw new Error(rpcMessage(error))
}

export async function fetchInvite(code: string) {
  if (!isSupabaseConfigured || !supabase) {
    return localRead<{ code: string; couple_id: string; created_by: string; expires_at: string; used_at: string | null }>(
      localInviteKey(code.trim().toUpperCase()),
    )
  }

  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  return data
}
