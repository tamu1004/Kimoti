import { isSupabaseConfigured, supabase } from './client'

export async function sendMagicLink(email: string, redirectTo: string) {
  if (!isSupabaseConfigured || !supabase) {
    return
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  })
  if (error) throw error
}

export async function signOut() {
  if (!isSupabaseConfigured || !supabase) {
    localStorage.removeItem('kimoti.dev.userId')
    return
  }

  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
