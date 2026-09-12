import { X } from 'lucide-react'
import { useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center overflow-hidden bg-black/60 backdrop-blur-[2px] md:items-center md:px-4 md:py-4"
      style={{ animation: 'fade-in 0.15s ease-out' }}
      onClick={onClose}
    >
      <div
        className="box-border flex max-h-[calc(100dvh-env(safe-area-inset-top))] w-full min-w-0 max-w-full flex-col overflow-hidden rounded-t-[20px] border border-border-soft bg-surface md:max-h-[88vh] md:w-[440px] md:max-w-[calc(100vw-2rem)] md:rounded-card"
        style={{ animation: 'modal-in 0.18s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-5 pt-5 md:px-6 md:pt-6">
          <h2 className="text-[16px] font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="focus-ring rounded-full p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        <div
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  )
}
