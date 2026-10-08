import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const styles: Record<Variant, string> = {
  primary:
    'bg-sage text-white shadow-sm hover:bg-sage-deep disabled:bg-fog disabled:text-white/80',
  secondary:
    'bg-card text-ink border border-line hover:border-sage/40 disabled:opacity-50',
  ghost: 'bg-transparent text-muted hover:text-ink disabled:opacity-50',
  danger: 'bg-transparent text-peach border border-peach/40 hover:bg-peach/10',
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
