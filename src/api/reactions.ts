import type { ReactionKind } from '../domain/signals'
import { isSupabaseConfigured, supabase } from './client'
import { mapReactionKind, type ReactionRow } from './mappers'

export type Reaction = Omit<ReactionRow, 'kind'> & { kind: ReactionKind }

function mapRow(row: ReactionRow): Reaction {
  return { ...row, kind: mapReactionKind(row.kind) }
}

const reactionKey = 'kimoti.dev.reactions'

export async function fetchReactionsForUser(userId: string): Promise<Reaction[]> {
  if (!isSupabaseConfigured || !supabase) {
    const rows = JSON.parse(localStorage.getItem(reactionKey) ?? '[]') as ReactionRow[]
    return rows
      .filter((row) => row.from_user_id === userId || row.to_user_id === userId)
      .slice(0, 20)
      .map((row) => ({ ...row, kind: mapReactionKind(row.kind) }))
  }

  const { data, error } = await supabase
    .from('reactions')
    .select('*')
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return (data ?? []).map(mapRow)
}

export async function sendReaction(input: {
  coupleId: string
  fromUserId: string
  toUserId: string
  kind: ReactionKind
  targetUpdatedAt: Date
}) {
  if (!isSupabaseConfigured || !supabase) {
    const rows = JSON.parse(localStorage.getItem(reactionKey) ?? '[]') as ReactionRow[]
    rows.unshift({
      id: crypto.randomUUID(),
      couple_id: input.coupleId,
      from_user_id: input.fromUserId,
      to_user_id: input.toUserId,
      kind: input.kind,
      target_updated_at: input.targetUpdatedAt.toISOString(),
      created_at: new Date().toISOString(),
    })
    localStorage.setItem(reactionKey, JSON.stringify(rows.slice(0, 50)))
    return
  }

  const { error } = await supabase.from('reactions').insert({
    couple_id: input.coupleId,
    from_user_id: input.fromUserId,
    to_user_id: input.toUserId,
    kind: input.kind,
    target_updated_at: input.targetUpdatedAt.toISOString(),
  })
  if (error) throw error
}
