import Modal from './Modal'
import Button from './Button'

export default function Dialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', variant = 'danger', confirmDisabled = false, hideConfirm = false }) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-[14px] text-text-muted leading-relaxed mb-6">{description}</p>
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={onClose}>
          {cancelLabel}
        </Button>
        {!hideConfirm && <Button
          variant={variant}
          className="flex-1"
          disabled={confirmDisabled}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirmLabel}
        </Button>}
      </div>
    </Modal>
  )
}
