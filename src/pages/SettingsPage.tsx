import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signOut } from '../api/auth'
import { deleteMyAccount, leaveCouple, setSharingPaused } from '../api/couples'
import { Button } from '../components/Button'
import { Screen } from '../components/AppShell'
import { useAuth } from '../features/session/AuthProvider'
import { useMembership, useProfile } from '../features/session/hooks'

export function SettingsPage() {
  const { user } = useAuth()
  const profile = useProfile()
  const membership = useMembership()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const paused = membership.data?.sharing_paused ?? false

  async function togglePause() {
    if (!user) return
    setPending(true)
    setError(null)
    try {
      await setSharingPaused(user.id, !paused)
      await queryClient.invalidateQueries({ queryKey: ['membership'] })
      await queryClient.invalidateQueries({ queryKey: ['couple-members'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : '変更できませんでした')
    } finally {
      setPending(false)
    }
  }

  async function onLeave() {
    if (!window.confirm('ペアを解除します。相手からも、いまの合図は見えなくなります。')) {
      return
    }
    setPending(true)
    try {
      await leaveCouple()
      await queryClient.invalidateQueries()
      navigate('/pair', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '解除できませんでした')
      setPending(false)
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        'アカウントと自分の記録を削除します。この操作は取り消せません。',
      )
    ) {
      return
    }
    setPending(true)
    try {
      await deleteMyAccount()
      await signOut()
      await queryClient.clear()
      navigate('/login', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '削除できませんでした')
      setPending(false)
    }
  }

  async function onSignOut() {
    await signOut()
    await queryClient.clear()
    navigate('/login', { replace: true })
  }

  return (
    <Screen>
      <h1 className="text-2xl font-medium">設定</h1>
      <p className="mt-2 text-sm text-muted">{profile.data?.nickname}</p>

      <section className="mt-6 rounded-3xl bg-card p-5 shadow-sm">
        <h2 className="font-medium">共有の一時停止</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          オンにすると、相手には「共有を一時停止中」とだけ見えます。
        </p>
        <Button
          className="mt-4"
          type="button"
          variant={paused ? 'primary' : 'secondary'}
          disabled={pending || !membership.data}
          onClick={() => void togglePause()}
        >
          {paused ? '共有を再開する' : '共有を一時停止する'}
        </Button>
      </section>

      {error ? <p className="mt-4 text-sm text-peach">{error}</p> : null}

      <div className="mt-6 space-y-3">
        <Button type="button" variant="secondary" onClick={() => void onSignOut()}>
          ログアウト
        </Button>
        <Button type="button" variant="danger" disabled={pending} onClick={() => void onLeave()}>
          ペアを解除する
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => void onDelete()}>
          アカウントを削除する
        </Button>
      </div>
    </Screen>
  )
}
