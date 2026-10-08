import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { useQuery } from '@tanstack/react-query'
import { fetchMySignalLogs } from '../api/signals'
import { SignalView } from '../components/SignalView'
import { Screen } from '../components/AppShell'
import { useNow } from '../features/home/useNow'
import { useAuth } from '../features/session/AuthProvider'

export function HistoryPage() {
  const { user } = useAuth()
  const now = useNow()
  const logs = useQuery({
    queryKey: ['signal-logs', user?.id],
    queryFn: () => fetchMySignalLogs(user!.id),
    enabled: Boolean(user?.id),
  })

  return (
    <Screen>
      <h1 className="text-2xl font-medium">自分の履歴</h1>
      <p className="mt-2 text-sm text-muted">相手の履歴は見えません。</p>
      <div className="mt-5 space-y-4">
        {logs.data?.length ? (
          logs.data.map((item, index) => (
            <div key={`${item.updated_at.toISOString()}-${index}`}>
              <p className="mb-2 text-xs text-fog">
                {format(item.updated_at, 'M月d日 H:mm', { locale: ja })}
              </p>
              <SignalView signal={item} now={now} size="small" />
            </div>
          ))
        ) : (
          <p className="rounded-2xl bg-card p-5 text-sm text-muted">
            まだ記録はありません。
          </p>
        )}
      </div>
    </Screen>
  )
}
