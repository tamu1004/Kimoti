import type { ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const item = ({ isActive }: { isActive: boolean }) =>
  `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${
    isActive ? 'text-sage-deep font-medium' : 'text-muted'
  }`

export function AppShell() {
  return (
    <div className="app-surface mx-auto flex min-h-dvh w-full max-w-[430px] flex-col">
      <div className="flex-1 pb-20">
        <Outlet />
      </div>
      <nav className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-card/95 backdrop-blur">
        <NavLink to="/" end className={item}>
          ホーム
        </NavLink>
        <NavLink to="/history" className={item}>
          履歴
        </NavLink>
        <NavLink to="/settings" className={item}>
          設定
        </NavLink>
      </nav>
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
