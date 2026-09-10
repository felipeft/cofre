import { useState } from 'react'
import { CalendarClock, Pencil, Plus, Trash2 } from 'lucide-react'
import Header from '@/layout/Header'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import Modal from '@/components/ui/Modal'
import { SkeletonRow } from '@/components/ui/Loading'
import RecurringExpenseForm from '@/components/recurringExpenses/RecurringExpenseForm'
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses'
import { useToast } from '@/contexts/ToastContext'
import { formatCurrency } from '@/utils/formatters'

export default function RecurringExpenses() {
  const { recurringExpenses, loading, error, createRecurringExpense, editRecurringExpense, removeRecurringExpense } = useRecurringExpenses()
  const [modal, setModal] = useState(null); const [deleting, setDeleting] = useState(null); const { showToast } = useToast()
  const save = async (data) => { try { if (modal.mode === 'create') await createRecurringExpense(data); else await editRecurringExpense(modal.item.id, data); showToast(modal.mode === 'create' ? 'Gasto recorrente criado' : 'Gasto recorrente atualizado'); setModal(null) } catch (err) { showToast(err.message ?? 'Não foi possível salvar.', 'error') } }
  const remove = async () => { try { const result = await removeRecurringExpense(deleting.id); showToast(result.message ?? 'Gasto recorrente desativado', 'info') } catch (err) { showToast(err.message ?? 'Não foi possível desativar.', 'error') } finally { setDeleting(null) } }
  return <div><Header title="Gastos recorrentes" subtitle="Obrigações mensais geradas automaticamente" actions={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>Novo</Button>} />
    <div className="px-5 md:px-8 pb-8 flex flex-col gap-3">{error ? <Card><EmptyState title="Não foi possível carregar os gastos recorrentes" description={error.message} /></Card> : loading ? Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} className="h-24" />) : recurringExpenses.length === 0 ? <Card><EmptyState icon={CalendarClock} title="Nenhum gasto recorrente" description="Cadastre uma obrigação mensal para gerar suas ocorrências automaticamente." action={<Button icon={Plus} onClick={() => setModal({ mode: 'create' })}>Novo gasto recorrente</Button>} /></Card> : recurringExpenses.map((item) => <Card key={item.id} className="p-4 flex items-center gap-3"><div className="min-w-0 flex-1"><p className="font-medium text-text">{item.description}</p><p className="text-[13px] text-text-muted">{formatCurrency(item.amount)} · Todo dia {item.dayOfMonth} · {item.category?.name}{item.card ? ` · ${item.card.name}` : ''}</p><p className="text-[12px] mt-1 text-text-faint">{item.isActive ? 'Ativo' : 'Inativo'} · início {item.startDate}{item.endDate ? ` · fim ${item.endDate}` : ''}</p></div><button onClick={() => setModal({ mode: 'edit', item })} className="focus-ring p-2 text-text-faint hover:text-text"><Pencil size={16} /></button>{item.isActive && <button onClick={() => setDeleting(item)} className="focus-ring p-2 text-text-faint hover:text-expense"><Trash2 size={16} /></button>}</Card>)}</div>
    <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.mode === 'edit' ? 'Editar gasto recorrente' : 'Novo gasto recorrente'}>{modal && <RecurringExpenseForm initial={modal.item} onSubmit={save} onCancel={() => setModal(null)} />}</Modal>
    <Dialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={remove} title="Desativar gasto recorrente" description={`Desativar "${deleting?.description}"? As ocorrências já geradas serão preservadas.`} confirmLabel="Desativar" />
  </div>
}
