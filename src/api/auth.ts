import { isSupabaseConfigured, supabase } from './client'

export async function signInAnonymously() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabaseが設定されていません')
  }

  const { error } = await supabase.auth.signInAnonymously()
  if (error) {
    if (error.message.toLowerCase().includes('anonymous')) {
      throw new Error(
        'SupabaseのAuthentication設定でAnonymous Sign-Insを有効にしてください',
      )
    }
    throw error
  }
}

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
