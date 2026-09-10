import { useEffect, useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { useCategories } from '@/hooks/useCategories'
import { useCards } from '@/hooks/useCards'
import { formatDateInput } from '@/utils/formatters'

const defaults = { description: '', amount: '', categoryId: '', dayOfMonth: '1', startDate: formatDateInput(), endDate: '', cardId: '', notes: '', isActive: true }
export default function RecurringExpenseForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(initial ? { ...initial, amount: String(initial.amount), dayOfMonth: String(initial.dayOfMonth), categoryId: initial.categoryId, cardId: initial.card?.id ?? '', endDate: initial.endDate ?? '' } : defaults)
  const [submitting, setSubmitting] = useState(false)
  const { categories, loading: categoriesLoading } = useCategories()
  const { cards, loading: cardsLoading } = useCards()
  const expenseCategories = categories.filter((category) => category.type === 'expense' && category.isActive)
  const activeCards = cards.filter((card) => card.isActive)
  useEffect(() => { if (!categoriesLoading && !expenseCategories.some((c) => c.id === form.categoryId)) setForm((prev) => ({ ...prev, categoryId: expenseCategories[0]?.id ?? '' })) }, [categoriesLoading, categories])
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))
  const submit = async (event) => { event.preventDefault(); setSubmitting(true); try { await onSubmit({ ...form, amount: Number(form.amount), categoryId: Number(form.categoryId), dayOfMonth: Number(form.dayOfMonth), cardId: form.cardId ? Number(form.cardId) : null, endDate: form.endDate || null }) } finally { setSubmitting(false) } }
  return <form onSubmit={submit} className="flex flex-col gap-4">
    <Input label="Descrição" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Ex: Internet" required />
    <Input label="Valor" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />
    <Select label="Categoria" value={form.categoryId} onChange={(e) => set({ categoryId: Number(e.target.value) })} disabled={categoriesLoading || !expenseCategories.length}>
      {expenseCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
    </Select>
    <Input label="Dia do mês" type="number" min="1" max="31" value={form.dayOfMonth} onChange={(e) => set({ dayOfMonth: e.target.value })} required />
    <Input label="Data de início" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} required />
    <Input label="Data final (opcional)" type="date" value={form.endDate} onChange={(e) => set({ endDate: e.target.value })} />
    <Select label="Cartão (opcional)" value={form.cardId} onChange={(e) => set({ cardId: e.target.value ? Number(e.target.value) : '' })} disabled={cardsLoading}>
      <option value="">Dinheiro, Pix, boleto ou outro</option>
      {activeCards.map((card) => <option key={card.id} value={card.id}>{card.name}</option>)}
    </Select>
    <Input label="Observações" value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
    <label className="flex items-center gap-2 text-[14px] text-text-muted"><input type="checkbox" checked={form.isActive} onChange={(e) => set({ isActive: e.target.checked })} /> Ativo</label>
    <div className="flex gap-3"><Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>Cancelar</Button><Button type="submit" variant="primary" className="flex-1" disabled={submitting || !form.categoryId}>{submitting ? 'Salvando…' : 'Salvar'}</Button></div>
  </form>
}
