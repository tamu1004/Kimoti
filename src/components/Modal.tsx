import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        aria-label="閉じる"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="glass-panel relative z-10 mb-0 w-full max-w-[430px] rounded-t-3xl p-5 pb-8 shadow-xl sm:mb-8 sm:rounded-3xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 id="modal-title" className="text-lg font-medium leading-snug">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted"
          >
            閉じる
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
