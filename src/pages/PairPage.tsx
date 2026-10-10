import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { createInviteCode, joinCouple, normalizeInviteCode } from '../api/couples'
import { Button } from '../components/Button'
import { Screen } from '../components/AppShell'
import { useCoupleRealtime } from '../features/home/useCoupleRealtime'
import { useAuth } from '../features/session/AuthProvider'
import { useMembership } from '../features/session/hooks'
import {
  clearPendingInvite,
  readPendingInvite,
  savePendingInvite,
} from '../features/session/storage'

export function PairPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [invite, setInvite] = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback] = useState<'copied' | 'failed' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const membership = useMembership()
  useCoupleRealtime(membership.data?.couple_id)
  const joinUrl = useMemo(
    () => (invite ? `${window.location.origin}/join?code=${invite}` : ''),
    [invite],
  )

  useEffect(() => {
    const pendingCode = readPendingInvite()
    if (pendingCode) setCode(normalizeInviteCode(pendingCode))
  }, [])

  useEffect(() => {
    if (!membership.data) return
    void createInviteCode()
      .then(setInvite)
      .catch(() => {
        /* 2人揃っているときは招待を作れない */
      })
  }, [membership.data])

  async function makeInvite() {
    setError(null)
    setPending(true)
    try {
      const next = await createInviteCode()
      setInvite(next)
      await queryClient.invalidateQueries({ queryKey: ['membership'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成できませんでした')
    } finally {
      setPending(false)
    }
  }

  async function join(event: FormEvent) {
    event.preventDefault()
    if (!user) return
    setError(null)
    setPending(true)
    try {
      await joinCouple(code)
      clearPendingInvite()
      await queryClient.invalidateQueries()
      navigate('/welcome', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : '参加できませんでした')
    } finally {
      setPending(false)
    }
  }

  async function copyLink() {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      setCopyFeedback('copied')
    } catch {
      setCopyFeedback('failed')
    }
  }

  return (
    <Screen className="py-10">
      <h1 className="text-2xl font-medium">ふたりをつなぐ</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        招待コードは24時間有効で、1回だけ使えます。
      </p>

      <section className="glass-panel mt-8 rounded-3xl p-5">
        <h2 className="font-medium">招待コードを作る</h2>
        {invite ? (
          <div className="mt-4 space-y-3">
            <p className="text-center text-3xl tracking-[0.3em]">{invite}</p>
            <p className="break-all text-xs text-muted">{joinUrl}</p>
            <Button type="button" variant="secondary" onClick={() => void copyLink()}>
              {copyFeedback === 'copied' ? 'もう一度コピー' : 'リンクをコピー'}
            </Button>
            {copyFeedback ? (
              <p className="text-sm text-aurora-teal" role="status" aria-live="polite">
                {copyFeedback === 'copied'
                  ? 'リンクをコピーしました。LINEに貼り付けて送れます。'
                  : 'コピーできませんでした。表示中のリンクを長押ししてコピーしてください。'}
              </p>
            ) : null}
          </div>
        ) : (
          <Button className="mt-4" type="button" disabled={pending} onClick={() => void makeInvite()}>
            {pending ? '作成中…' : '招待コードを作る'}
          </Button>
        )}
      </section>

      <section className="glass-panel mt-5 rounded-3xl p-5">
        <h2 className="font-medium">招待コードを入力する</h2>
        <form className="mt-4 space-y-3" onSubmit={(e) => void join(e)}>
          <input
            value={code}
            onChange={(e) => setCode(normalizeInviteCode(e.target.value))}
            minLength={6}
            maxLength={8}
            className="min-h-12 w-full rounded-2xl border border-line bg-[#080d17]/80 px-4 tracking-[0.2em] outline-none focus:border-aurora-cyan"
            placeholder="ABC12XYZ"
          />
          {error ? <p className="text-sm text-peach">{error}</p> : null}
          <Button type="submit" disabled={pending || code.trim().length < 6}>
            参加する
          </Button>
        </form>
      </section>
    </Screen>
  )
}

export function JoinPage() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const code = (params.get('code') ?? '').toUpperCase()

  useEffect(() => {
    if (code) savePendingInvite(code)
    if (!user) {
      navigate('/login', { replace: true })
      return
    }
    navigate('/pair', { replace: true })
  }, [code, navigate, user])

  return (
    <Screen className="flex min-h-dvh items-center justify-center">
      <p className="text-muted">招待を開いています…</p>
      <Link to="/login" className="sr-only">
        ログイン
      </Link>
    </Screen>
  )
}
