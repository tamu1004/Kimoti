import { useEffect, useState, type ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

const menuItem = ({ isActive }: { isActive: boolean }) =>
  `block rounded-xl px-4 py-3 text-sm transition-colors ${
    isActive
      ? 'bg-aurora-teal/10 text-aurora-teal'
      : 'text-ink hover:bg-white/5'
  }`

export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  return (
    <div className="app-surface mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
      <header className="glass-panel sticky top-0 z-30 flex items-center justify-between border-x-0 border-t-0 px-5 py-3">
        <NavLink to="/" className="block" aria-label="Kimoti ホーム">
          <p className="bg-gradient-to-r from-aurora-teal via-aurora-indigo to-aurora-rose bg-clip-text text-xs font-bold tracking-[0.16em] text-transparent">
            KIMOTI
          </p>
          <p className="mt-0.5 text-[11px] text-muted">ふたりの会話の合図</p>
        </NavLink>
        <button
          type="button"
          className="flex size-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-xl text-aurora-cyan transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurora-cyan"
          aria-label={menuOpen ? 'メニューを閉じる' : 'メニューを開く'}
          aria-expanded={menuOpen}
          aria-controls="app-navigation-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span aria-hidden="true">{menuOpen ? '×' : '☰'}</span>
        </button>
      </header>

      {menuOpen ? (
        <>
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="fixed inset-0 z-30 cursor-default bg-[#03060c]/55"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="app-navigation-menu"
            aria-label="メインメニュー"
            className="glass-panel absolute right-3 top-[4.5rem] z-40 w-56 rounded-2xl p-2 shadow-2xl"
          >
            <NavLink to="/" end className={menuItem}>
              ホーム
            </NavLink>
            <NavLink to="/history" className={menuItem}>
              自分の履歴
            </NavLink>
            <NavLink to="/settings" className={menuItem}>
              設定
            </NavLink>
          </nav>
        </>
      ) : null}

      <div className="flex-1 pb-6">
        <Outlet />
      </div>
    </div>
  )
}

export function Screen({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`mx-auto w-full max-w-[430px] px-5 py-6 ${className}`}>
      {children}
    </div>
  )
}
