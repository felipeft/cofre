import { useState } from 'react'
import { AlertTriangle, Database, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { useToast } from '@/contexts/ToastContext'
import * as service from '@/services/dataManagement.service'

const CONFIG = {
  'clear-records': {
    title: 'Limpar todos os registros financeiros',
    description: 'Remove movimentações, pagamentos de fatura e históricos de sincronização. Categorias, cartões, recorrências, perfil e preferências permanecem.',
    action: service.clearFinancialRecords,
  },
  reset: {
    title: 'Resetar completamente o Cofre',
    description: 'Remove movimentações, categorias, cartões, pagamentos e gastos recorrentes. A conta, a sessão e a aparência permanecem.',
    action: service.resetCofre,
  },
}

const LABELS = {
  transactions: 'Movimentações', recurringExpenses: 'Gastos recorrentes', categories: 'Categorias',
  cards: 'Cartões', cardPayments: 'Pagamentos de fatura', sheetImports: 'Importações da planilha',
  syncRuns: 'Históricos de sincronização',
}

export default function DataManagementSettings() {
  const [dialog, setDialog] = useState(null)
  const [confirmation, setConfirmation] = useState('')
  const [executing, setExecuting] = useState(false)
  const { showToast } = useToast()

  const openPreview = async (operation) => {
    setConfirmation('')
    setDialog({ operation, loading: true, preview: null })
    try {
      const preview = await service.getDataDeletionPreview(operation)
      setDialog((current) => current?.operation === operation ? { operation, loading: false, preview } : current)
    } catch (error) {
      setDialog(null)
      showToast(error.message || 'Não foi possível calcular o impacto da operação.', 'error')
    }
  }

  const execute = async () => {
    if (!dialog?.preview || confirmation !== dialog.preview.confirmationPhrase) return
    setExecuting(true)
    try {
      const config = CONFIG[dialog.operation]
      const result = await config.action(confirmation)
      showToast(result.message || 'Operação concluída.', 'success')
      setDialog(null)
      window.location.assign('/')
    } catch (error) {
      showToast(error.message || 'Não foi possível concluir a operação.', 'error')
    } finally { setExecuting(false) }
  }

  return (
    <>
      <div className="grid gap-3 p-4">
        <div className="flex gap-3 rounded-control border border-border bg-surface-2 p-4">
          <Database size={20} className="mt-0.5 shrink-0 text-text-muted" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-text">Limpar registros financeiros</p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-muted">Zera históricos e limites utilizados sem remover sua estrutura de categorias, cartões ou recorrências.</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => openPreview('clear-records')}>Ver impacto e limpar</Button>
          </div>
        </div>

        <div className="flex gap-3 rounded-control border border-expense/30 bg-expense/5 p-4">
          <RotateCcw size={20} className="mt-0.5 shrink-0 text-expense" />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-text">Resetar completamente o Cofre</p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-muted">Volta os dados financeiros ao estado de uma instalação nova. Sua conta Google e sessão não são apagadas.</p>
            <Button variant="danger" size="sm" className="mt-3" onClick={() => openPreview('reset')}>Ver impacto e resetar</Button>
          </div>
        </div>
      </div>

      <Modal open={!!dialog} onClose={() => !executing && setDialog(null)} title={dialog ? CONFIG[dialog.operation].title : ''}>
        {dialog?.loading ? <p className="text-[14px] text-text-muted">Calculando exatamente o que será apagado…</p> : dialog?.preview && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-3 rounded-control border border-alert/30 bg-alert/10 p-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-alert" />
              <p className="text-[13px] leading-relaxed text-text-muted">{CONFIG[dialog.operation].description}</p>
            </div>

            <div className="divide-y divide-border-soft rounded-control border border-border bg-surface-2 px-3">
              {Object.entries(dialog.preview.counts).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-2.5 text-[13px]">
                  <span className="text-text-muted">{LABELS[key]}</span>
                  <strong className="num text-text">{value}</strong>
                </div>
              ))}
              <div className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="font-medium text-text">Total de registros</span>
                <strong className="num text-expense">{dialog.preview.totalRecords}</strong>
              </div>
            </div>

            {dialog.preview.spreadsheetWillBeOverwritten && (
              <p className="rounded-control border border-info/30 bg-info/10 p-3 text-[12px] leading-relaxed text-text-muted">
                Na próxima sincronização, o Cofre exportará primeiro o novo estado vazio para a planilha. Linhas antigas da planilha não serão reimportadas.
              </p>
            )}

            <Input
              label={`Digite ${dialog.preview.confirmationPhrase} para confirmar`}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
            />

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" disabled={executing} onClick={() => setDialog(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" disabled={executing || confirmation !== dialog.preview.confirmationPhrase} onClick={execute}>
                {executing ? 'Processando…' : 'Confirmar exclusão'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
