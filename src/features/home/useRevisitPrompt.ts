import { useCallback, useEffect, useRef, useState } from 'react'
import { getSignalStatus } from '../../domain/expiry'
import type { MappedSignal } from '../../api/mappers'

const TAB_ID = crypto.randomUUID()
const LOCK_KEY = 'kimoti.revisit.lock'
const CHANNEL = 'kimoti-revisit'

function dismissedKey(revisitAt: Date) {
  return `kimoti.revisit.dismissed.${revisitAt.getTime()}`
}

function tryLock() {
  const now = Date.now()
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as { tab: string; until: number }
      if (parsed.tab !== TAB_ID && parsed.until > now) return false
    }
    localStorage.setItem(
      LOCK_KEY,
      JSON.stringify({ tab: TAB_ID, until: now + 8000 }),
    )
    return true
  } catch {
    return true
  }
}

function releaseLock() {
  try {
    const raw = localStorage.getItem(LOCK_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { tab: string }
    if (parsed.tab === TAB_ID) localStorage.removeItem(LOCK_KEY)
  } catch {
    /* ignore */
  }
}

export function useRevisitPrompt(mySignal: MappedSignal | null | undefined) {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  openRef.current = open

  const shouldPrompt = useCallback(() => {
    if (!mySignal?.revisit_at) return false
    const status = getSignalStatus(mySignal, new Date())
    if (status !== 'overdue') return false
    if (sessionStorage.getItem(dismissedKey(mySignal.revisit_at))) return false
    return true
  }, [mySignal])

  const show = useCallback(() => {
    if (!shouldPrompt()) return
    if (!tryLock()) return
    setOpen(true)
  }, [shouldPrompt])

  const dismiss = useCallback(() => {
    if (mySignal?.revisit_at) {
      sessionStorage.setItem(dismissedKey(mySignal.revisit_at), '1')
      try {
        const ch = new BroadcastChannel(CHANNEL)
        ch.postMessage({
          type: 'dismiss',
          at: mySignal.revisit_at.getTime(),
        })
        ch.close()
      } catch {
        /* ignore */
      }
    }
    setOpen(false)
    releaseLock()
  }, [mySignal])

  useEffect(() => {
    const titleBase = 'Kimoti'
    if (shouldPrompt()) {
      document.title = '(1) 話せそう?'
    } else {
      document.title = titleBase
    }
    return () => {
      document.title = titleBase
    }
  }, [shouldPrompt])

  useEffect(() => {
    show()
    const onVis = () => {
      if (document.visibilityState === 'visible') show()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [show])

  useEffect(() => {
    if (!mySignal?.revisit_at) return
    const delay = mySignal.revisit_at.getTime() - Date.now()
    if (delay <= 0) return
    const id = window.setTimeout(() => show(), delay)
    return () => window.clearTimeout(id)
  }, [mySignal?.revisit_at, show])

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => {
      tryLock()
    }, 3000)
    return () => window.clearInterval(id)
  }, [open])

  useEffect(() => {
    let ch: BroadcastChannel | null = null
    try {
      ch = new BroadcastChannel(CHANNEL)
      ch.onmessage = (event: MessageEvent<{ type: string; at: number }>) => {
        if (event.data?.type === 'dismiss' && mySignal?.revisit_at) {
          if (event.data.at === mySignal.revisit_at.getTime()) {
            sessionStorage.setItem(dismissedKey(mySignal.revisit_at), '1')
            setOpen(false)
            releaseLock()
          }
        }
      }
    } catch {
      /* ignore */
    }
    return () => ch?.close()
  }, [mySignal?.revisit_at])

  return { open, dismiss, show }
}
