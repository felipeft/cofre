import { useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import Header from '@/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import EmptyState from '@/components/ui/EmptyState'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { SkeletonRow } from '@/components/ui/Loading'
import RecurringExpenseForm from '@/components/recurringExpenses/RecurringExpenseForm'
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses'
import { useToast } from '@/contexts/ToastContext'
import { getRecurringExpenseDeletionPreview } from '@/services/recurringExpense.service'
import { formatCurrency } from '@/utils/formatters'

const CONFIRMATION = 'EXCLUIR RECORRÊNCIA'

export default function RecurringExpenses() {
  const { recurringExpenses, loading, error, createRecurringExpense, editRecurringExpense, removeRecurringExpense } = useRecurringExpenses()
  const [modal, setModal] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteMode, setDeleteMode] = useState('preserve-history')
  const [confirmation, setConfirmation] = useState('')
  const [removing, setRemoving] = useState(false)
  const { showToast } = useToast()

  const save = async (data) => {
    try {
      if (modal.mode === 'create') await createRecurringExpense(data)
      else await editRecurringExpense(modal.item.id, data)
      showToast(modal.mode === 'create' ? 'Gasto recorrente criado' : 'Gasto recorrente atualizado')
      setModal(null)
    } catch (err) { showToast(err.message ?? 'Não foi possível salvar.', 'error') }
  }

  const prepareDelete = async (item) => {
    setDeleteMode('preserve-history')
    setConfirmation('')
    setDeleting({ item, preview: null, loading: true })
    try {
      const preview = await getRecurringExpenseDeletionPreview(item.id)
      setDeleting((current) => current?.item.id === item.id ? { item, preview, loading: false } : current)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível calcular o impacto da exclusão.', 'error')
      setDeleting(null)
    }
  }

  const remove = async () => {
    if (!deleting?.preview || confirmation !== CONFIRMATION) return
    setRemoving(true)
    try {
      const result = await removeRecurringExpense(deleting.item.id, deleteMode)
      showToast(result.message ?? 'Gasto recorrente excluído', 'info')
      setDeleting(null)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível excluir.', 'error')
    } finally { setRemoving(false) }
  }

  return (
    <div>
      <Header title="Gastos recorrentes" subtitle="Obrigações mensais geradas automaticamente" actions={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>Novo</Button>} />
      <div className="px-5 md:px-8 pb-8 flex flex-col gap-3">
        {error ? <Card><EmptyState title="Não foi possível carregar os gastos recorrentes" description={error.message} /></Card>
          : loading ? Array.from({ length: 3 }).map((_, index) => <SkeletonRow key={index} className="h-24" />)
            : recurringExpenses.length === 0 ? <Card><EmptyState icon={CalendarClock} title="Nenhum gasto recorrente" description="Cadastre uma obrigação mensal para gerar suas ocorrências automaticamente." action={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>Novo gasto recorrente</Button>} /></Card>
              : recurringExpenses.map((item) => (
                <Card key={item.id} className="p-4 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-text">{item.description}</p>
                    <p className="text-[13px] text-text-muted">{formatCurrency(item.amount)} · Todo dia {item.dayOfMonth} · {item.category?.name}{item.card ? ` · ${item.card.name}` : ''}</p>
                    <p className="text-[12px] mt-1 text-text-faint">{item.isActive ? 'Ativo' : 'Inativo'} · início {item.startDate}{item.endDate ? ` · fim ${item.endDate}` : ''}</p>
                  </div>
                  <button onClick={() => setModal({ mode: 'edit', item })} className="focus-ring p-2 text-text-faint hover:text-text" aria-label="Editar"><Pencil size={16} /></button>
                  <button onClick={() => prepareDelete(item)} className="focus-ring p-2 text-text-faint hover:text-expense" aria-label="Excluir"><Trash2 size={16} /></button>
                </Card>
              ))}
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Editar gasto recorrente' : 'Novo gasto recorrente'}>
        {modal && <RecurringExpenseForm initial={modal.item} onSubmit={save} onCancel={() => setModal(null)} />}
      </Modal>

      <Modal open={!!deleting} onClose={() => !removing && setDeleting(null)} title="Excluir gasto recorrente">
        {deleting?.loading ? <p className="text-[14px] text-text-muted">Calculando impacto…</p> : deleting?.preview && (
          <div className="flex flex-col gap-4">
            <div className="rounded-control border border-border bg-surface-2 p-3 text-[13px] text-text-muted">
              <p><strong className="text-text">{deleting.preview.transactionCount}</strong> movimentações associadas</p>
              <p>Valor histórico: <strong className="text-text">{formatCurrency(deleting.preview.totalAmount)}</strong></p>
              {deleting.preview.firstDate && <p>Período: {deleting.preview.firstDate} até {deleting.preview.lastDate}</p>}
              {deleting.preview.cardLimitImpact > 0 && <p>Impacto atual no limite: {formatCurrency(deleting.preview.cardLimitImpact)}</p>}
            </div>

            <div className="grid gap-2">
              <button type="button" onClick={() => setDeleteMode('preserve-history')} className={`focus-ring rounded-control border p-3 text-left ${deleteMode === 'preserve-history' ? 'border-income bg-income/10' : 'border-border bg-surface-2'}`}>
                <span className="block text-[13px] font-semibold text-text">Preservar histórico</span>
                <span className="text-[12px] text-text-muted">Exclui a regra e mantém as movimentações já geradas.</span>
              </button>
              <button type="button" onClick={() => setDeleteMode('with-history')} className={`focus-ring rounded-control border p-3 text-left ${deleteMode === 'with-history' ? 'border-expense bg-expense/10' : 'border-border bg-surface-2'}`}>
                <span className="block text-[13px] font-semibold text-text">Excluir também o histórico</span>
                <span className="text-[12px] text-text-muted">Apaga definitivamente a regra e todas as {deleting.preview.transactionCount} movimentações associadas.</span>
              </button>
            </div>

            <Input label={`Digite ${CONFIRMATION} para confirmar`} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" />
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" disabled={removing} onClick={() => setDeleting(null)}>Cancelar</Button>
              <Button variant="danger" className="flex-1" disabled={removing || confirmation !== CONFIRMATION} onClick={remove}>{removing ? 'Excluindo…' : 'Excluir'}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
