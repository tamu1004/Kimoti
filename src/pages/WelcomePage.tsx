import { useNavigate } from 'react-router-dom'
import { PRESET_LIST } from '../domain/signals'
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
    <Screen className="pb-10">
      <h1 className="text-2xl font-medium leading-snug">ふたりで、合図の意味を確認しましょう</h1>
      <div className="mt-5 space-y-3 rounded-3xl bg-card p-5 text-sm leading-relaxed shadow-sm">
        <p>合図は拒絶ではなく、あとでちゃんと話すための予告です。</p>
        <p>更新しなくても大丈夫です。未更新は問題ではありません。</p>
      </div>

      <ul className="mt-6 space-y-2">
        {PRESET_LIST.map((preset) => (
          <li
            key={preset.id}
            className="flex items-start gap-3 rounded-2xl bg-card px-4 py-3 text-sm"
          >
            <span className="text-lg" aria-hidden>
              {preset.emoji}
            </span>
            <span className="leading-relaxed">{preset.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-6 text-sm leading-relaxed text-muted">
        大きなボタンから合図を選ぶだけです。期限は「いつごろ様子を伝えるか」の目安です。
      </p>

      <Button className="mt-8" type="button" onClick={continueOn}>
        はじめる
      </Button>
    </Screen>
  )
}
