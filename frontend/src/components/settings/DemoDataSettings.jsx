import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import { resetDemo } from '@/services/demo.service'
import { useToast } from '@/contexts/ToastContext'

export default function DemoDataSettings() {
  const [confirming, setConfirming] = useState(false)
  const [resetting, setResetting] = useState(false)
  const { showToast } = useToast()

  const handleReset = async () => {
    setResetting(true)
    try {
      const response = await resetDemo()
      showToast(response.message, 'success')
      window.location.assign('/')
    } catch (error) {
      showToast(error.message || 'Não foi possível restaurar a demonstração.', 'error')
      setResetting(false)
    }
  }

  return (
    <div className="p-4">
      <div className="flex gap-3 rounded-control border border-info/25 bg-info/10 p-4">
        <RotateCcw size={20} className="mt-0.5 shrink-0 text-info" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-text">Resetar demonstração</p>
          <p className="mt-1 text-[12px] leading-relaxed text-text-muted">Apaga somente os dados locais do Cofre Demo neste navegador e restaura o cenário fictício original.</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => setConfirming(true)}>Restaurar dados fictícios</Button>
        </div>
      </div>
      <Dialog
        open={confirming}
        onClose={() => !resetting && setConfirming(false)}
        onConfirm={handleReset}
        title="Resetar demonstração?"
        description="Todas as alterações feitas nesta demonstração serão apagadas. Nenhum dado de outras aplicações ou sites será removido."
        confirmLabel={resetting ? 'Restaurando…' : 'Resetar demonstração'}
        confirmDisabled={resetting}
      />
    </div>
  )
}
