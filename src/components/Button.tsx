import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary:
    'bg-gradient-to-r from-aurora-teal via-aurora-cyan to-aurora-indigo text-aurora-deep shadow-[0_8px_26px_rgba(56,189,248,0.2)] hover:brightness-110 disabled:bg-fog disabled:bg-none disabled:text-white/80 disabled:opacity-60',
  secondary:
    'glass-panel text-ink hover:border-aurora-cyan/50 disabled:opacity-50',
  ghost: 'bg-transparent text-muted hover:text-ink disabled:opacity-50',
  danger: 'bg-transparent text-rose-200 border border-rose-300/30 hover:bg-rose-300/10',
}

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  children: ReactNode
}) {
  return (
    <button
      className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-[15px] font-medium transition ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
