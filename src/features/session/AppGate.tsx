import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { isSupabaseConfigured } from '../../api/client'
import { useAuth } from './AuthProvider'
import { useCoupleMembers, useMembership, useProfile } from './hooks'
import { hasSeenWelcome } from './storage'

export function AppGate() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const profileQuery = useProfile()
  const membershipQuery = useMembership()
  const membersQuery = useCoupleMembers(membershipQuery.data?.couple_id)

  if (
    loading ||
    (user &&
      (profileQuery.isLoading ||
        membershipQuery.isLoading ||
        (membershipQuery.data && membersQuery.isLoading)))
  ) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-[430px] items-center justify-center text-muted">
        読み込み中…
      </div>
    )
  }

  const path = location.pathname

  if (!user) {
    if (path === '/login' || path === '/join') return <Outlet />
    return <Navigate to="/login" replace />
  }

  if (!isSupabaseConfigured && path === '/login') {
    return <Outlet />
  }

  if (path === '/login') {
    return <Navigate to="/" replace />
  }

  const nickname = profileQuery.data?.nickname?.trim() ?? ''
  const membership = membershipQuery.data
  const memberCount = membersQuery.data?.length ?? 0
  const needsSetup = nickname.length < 1
  const waitingForPartner = Boolean(membership) && memberCount < 2
  const needsPair = !membership || waitingForPartner
  const needsWelcome =
    Boolean(membership) &&
    memberCount >= 2 &&
    !hasSeenWelcome(user.id, membership!.couple_id)

  if (needsSetup && path !== '/setup') {
    return <Navigate to="/setup" replace />
  }
  if (!needsSetup && path === '/setup') {
    return <Navigate to={needsPair ? '/pair' : '/'} replace />
  }
  if (!needsSetup && needsPair && path !== '/pair' && path !== '/join') {
    return <Navigate to="/pair" replace />
  }
  if (!needsSetup && !needsPair && (path === '/pair' || path === '/join')) {
    return <Navigate to="/" replace />
  }
  if (!needsSetup && !needsPair && needsWelcome && path !== '/welcome') {
    return <Navigate to="/welcome" replace />
  }

  return <Outlet />
}
