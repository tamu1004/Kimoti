import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInAnonymously } from '../api/auth'
import { upsertNickname } from '../api/couples'
import { Button } from '../components/Button'
import { Screen } from '../components/AppShell'
import { useAuth } from '../features/session/AuthProvider'
import { DEV_USER_ID, isSupabaseConfigured } from '../api/client'

export function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function startSupabase() {
    setError(null)
    setPending(true)
    try {
      await signInAnonymously()
      window.location.assign('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '開始できませんでした')
    } finally {
      setPending(false)
    }
  }

  function startLocalDev() {
    sessionStorage.setItem('kimoti.dev.userId', DEV_USER_ID)
    window.location.assign('/')
  }

  function startLocalPartner() {
    sessionStorage.setItem(
      'kimoti.dev.userId',
      `local-dev-partner-${crypto.randomUUID()}`,
    )
    window.location.assign('/')
  }

  return (
    <Screen className="flex min-h-dvh flex-col justify-center">
      <p className="text-sm tracking-wide text-sage">Kimoti</p>
      <h1 className="mt-2 text-2xl font-medium leading-snug">
        今、話しかけていいかを
        <br />
        やさしく共有する
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-muted">
        合図は拒絶ではなく、「あとでちゃんと話したい」の予告です。
      </p>

      {!isSupabaseConfigured ? (
        <div className="mt-8 space-y-3">
          <Button type="button" onClick={startLocalDev}>
            ローカルの1人目として開始
          </Button>
          <Button type="button" variant="secondary" onClick={startLocalPartner}>
            ローカルの2人目として参加
          </Button>
          <p className="text-xs leading-relaxed text-muted">
            2人で試すときは、別タブで開いてから2人目を選んでください。
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          <Button
            type="button"
            disabled={pending}
            onClick={() => void startSupabase()}
          >
            {pending ? '準備中…' : '招待コードで始める'}
          </Button>
          {error ? <p className="text-sm text-peach">{error}</p> : null}
          <p className="text-xs leading-relaxed text-muted">
            メールアドレスは不要です。次の画面で招待コードを入力するか、コードを作成できます。
          </p>
        </div>
      )}
    </Screen>
  )
}

export function SetupPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    const value = nickname.trim()
    if (value.length < 1 || value.length > 12) {
      setError('ニックネームは1〜12文字です')
      return
    }
    setPending(true)
    setError(null)
    try {
      await upsertNickname(user.id, value)
      await queryClient.invalidateQueries({ queryKey: ['profile'] })
      navigate('/pair', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存できませんでした')
    } finally {
      setPending(false)
    }
  }

  return (
    <Screen className="flex min-h-dvh flex-col justify-center">
      <h1 className="text-2xl font-medium">呼び名を教えてください</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        相手の画面では、この名前で表示されます。
      </p>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={12}
          className="min-h-12 w-full rounded-2xl border border-line bg-card px-4 outline-none focus:border-sage"
          placeholder="1〜12文字"
        />
        {error ? <p className="text-sm text-peach">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? '保存中…' : '次へ'}
        </Button>
      </form>
    </Screen>
  )
}
