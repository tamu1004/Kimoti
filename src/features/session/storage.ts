export const PENDING_INVITE_KEY = 'kimoti.pendingInviteCode'

export function savePendingInvite(code: string) {
  localStorage.setItem(PENDING_INVITE_KEY, code.trim().toUpperCase())
}

export function readPendingInvite(): string | null {
  return localStorage.getItem(PENDING_INVITE_KEY)
}

export function clearPendingInvite() {
  localStorage.removeItem(PENDING_INVITE_KEY)
}

export function welcomeKey(userId: string, coupleId: string) {
  return `kimoti.welcome.${userId}.${coupleId}`
}

export function hasSeenWelcome(userId: string, coupleId: string) {
  return localStorage.getItem(welcomeKey(userId, coupleId)) === '1'
}

export function markWelcomeSeen(userId: string, coupleId: string) {
  localStorage.setItem(welcomeKey(userId, coupleId), '1')
}
