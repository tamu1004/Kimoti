import { useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Screen } from '../components/AppShell'
import { useAuth } from '../features/session/AuthProvider'
import { useMembership } from '../features/session/hooks'
import { markWelcomeSeen } from '../features/session/storage'

export function WelcomePage() {
  const { user } = useAuth()
  const membership = useMembership()
  const navigate = useNavigate()

  function continueOn() {
    if (user && membership.data) {
      markWelcomeSeen(user.id, membership.data.couple_id)
    }
    navigate('/', { replace: true })
  }

  return (
    <Screen className="flex min-h-dvh flex-col justify-center pb-10">
      <header>
        <p className="bg-gradient-to-r from-aurora-teal via-aurora-indigo to-aurora-rose bg-clip-text text-xs font-bold tracking-[0.16em] text-transparent">KIMOTI</p>
        <p className="mt-1 text-xs text-muted">ふたりの会話の合図</p>
      </header>

      <main className="mt-9">
        <p className="text-sm font-medium text-aurora-teal">話すタイミングを、一緒に。</p>
        <h1 className="mt-2 text-[1.8rem] font-medium leading-snug">
          気持ちを知って、<br />
          話せる頃を待ち合わせ。
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted">
          今の気持ちと、また話せそうな頃を伝え合う。会話を避けるためではなく、ちゃんと話すための小さな合図です。
        </p>

        <div className="mt-8 flex items-center justify-between px-1" aria-label="気持ちを伝え合い、話すタイミングを合わせるイメージ">
          <span className="flex size-14 items-center justify-center rounded-full bg-mint text-3xl" aria-hidden="true">
            🌿
          </span>
          <span className="mx-3 h-px flex-1 border-t border-dashed border-sage/50" aria-hidden="true" />
          <span className="max-w-24 text-center text-xs leading-relaxed text-muted">話せる頃を<br />すり合わせる</span>
          <span className="mx-3 h-px flex-1 border-t border-dashed border-peach/60" aria-hidden="true" />
          <span className="flex size-14 items-center justify-center rounded-full bg-blush text-3xl" aria-hidden="true">
            💬
          </span>
        </div>

        <ul className="mt-8 grid grid-cols-3 gap-2 text-center text-xs">
          <li className="rounded-xl border border-line bg-card px-2 py-3 text-ink">☀️ 話せる</li>
          <li className="rounded-xl border border-line bg-card px-2 py-3 text-ink">🌙 少し待って</li>
          <li className="rounded-xl border border-line bg-card px-2 py-3 text-ink">💬 聞いてほしい</li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          合図を更新できない日があっても大丈夫。期限を過ぎた合図は「状態不明」として扱います。
        </p>
      </main>

      <Button className="mt-8" type="button" onClick={continueOn}>
        ふたりの合図をはじめる
      </Button>
    </Screen>
  )
}
