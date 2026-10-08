import { useQuery } from '@tanstack/react-query'
import { fetchCoupleMembers, fetchMyMembership, fetchProfile } from '../../api/couples'
import { useAuth } from './AuthProvider'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['membership', user?.id],
    queryFn: () => fetchMyMembership(user!.id),
    enabled: Boolean(user?.id),
  })
}

export function useCoupleMembers(coupleId: string | undefined) {
  return useQuery({
    queryKey: ['couple-members', coupleId],
    queryFn: () => fetchCoupleMembers(coupleId!),
    enabled: Boolean(coupleId),
  })
}
