import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { isSupabaseConfigured, supabase } from '../../api/client'
import { fetchReactionsForUser } from '../../api/reactions'
import { fetchCurrentSignal } from '../../api/signals'
import { useAuth } from '../session/AuthProvider'

export function useCurrentSignal(userId: string | undefined) {
  return useQuery({
    queryKey: ['signal', userId],
    queryFn: () => fetchCurrentSignal(userId!),
    enabled: Boolean(userId),
  })
}

export function useReactions(userId: string | undefined) {
  return useQuery({
    queryKey: ['reactions', userId],
    queryFn: () => fetchReactionsForUser(userId!),
    enabled: Boolean(userId),
  })
}

export function useCoupleRealtime(coupleId: string | undefined) {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!coupleId || !user || !isSupabaseConfigured || !supabase) return

    const client = supabase
    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ['signal'] })
      void queryClient.invalidateQueries({ queryKey: ['reactions'] })
      void queryClient.invalidateQueries({ queryKey: ['couple-members'] })
      void queryClient.invalidateQueries({ queryKey: ['membership'] })
      void queryClient.invalidateQueries({ queryKey: ['profile'] })
    }

    const subscribe = () =>
      client
        .channel(`couple:${coupleId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'current_signals',
            filter: `couple_id=eq.${coupleId}`,
          },
          invalidate,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'reactions',
            filter: `couple_id=eq.${coupleId}`,
          },
          invalidate,
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'couple_members',
            filter: `couple_id=eq.${coupleId}`,
          },
          invalidate,
        )
        .subscribe((status) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            void client.removeChannel(channel)
            channel = subscribe()
          }
        })

    let channel = subscribe()

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        invalidate()
        void client.removeChannel(channel)
        channel = subscribe()
      }
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      document.removeEventListener('visibilitychange', onVis)
      void client.removeChannel(channel)
    }
  }, [coupleId, queryClient, user])
}
