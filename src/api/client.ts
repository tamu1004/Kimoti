import { createClient } from '@supabase/supabase-js'
import type { Database } from './database'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const forceLocalDev = import.meta.env.VITE_USE_LOCAL_DEV === 'true'
export const isSupabaseConfigured = !forceLocalDev && Boolean(url && anonKey)

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase は未使用です。ローカル開発用の簡易モードで動作します。',
  )
}

export const DEV_USER_ID = 'local-dev-user'

export function getLocalDevUserId(): string {
  return sessionStorage.getItem('kimoti.dev.userId') ?? DEV_USER_ID
}

export const supabase = isSupabaseConfigured
  ? createClient<Database>(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
