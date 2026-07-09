import { X } from 'lucide-react'
import { useEffect } from 'react'

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-[2px]"
      style={{ animation: 'fade-in 0.15s ease-out' }}
      onClick={onClose}
    >
      <div
        className="w-full md:w-[440px] max-h-[88vh] overflow-y-auto rounded-t-[20px] md:rounded-card bg-surface border border-border-soft p-5 md:p-6"
        style={{ animation: 'modal-in 0.18s cubic-bezier(0.16,1,0.3,1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="focus-ring rounded-full p-1.5 text-text-muted hover:text-text hover:bg-surface-2 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
