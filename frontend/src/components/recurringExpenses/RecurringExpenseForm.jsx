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
  const [amountFocused, setAmountFocused] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { categories, loading: categoriesLoading } = useCategories()
  const { cards, loading: cardsLoading } = useCards()
  const expenseCategories = categories.filter((category) => category.type === 'expense' && category.isActive)
  const activeCards = cards.filter((card) => card.isActive)
  useEffect(() => {
    if (categoriesLoading) return

    const availableCategories = categories.filter((category) => category.type === 'expense' && category.isActive)
    setForm((previous) => availableCategories.some((category) => category.id === previous.categoryId)
      ? previous
      : { ...previous, categoryId: availableCategories[0]?.id ?? '' })
  }, [categoriesLoading, categories])
  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))
  const submit = async (event) => { event.preventDefault(); setSubmitting(true); try { await onSubmit({ ...form, amount: Number(form.amount), categoryId: Number(form.categoryId), dayOfMonth: Number(form.dayOfMonth), cardId: form.cardId ? Number(form.cardId) : null, endDate: form.endDate || null }) } finally { setSubmitting(false) } }
  return <form onSubmit={submit} className="flex flex-col gap-4">
    <Input label="Descrição" value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="Ex: Internet" required />
    <div className="flex flex-col gap-1.5">
      <label htmlFor="recurring-expense-amount" className="text-[13px] font-medium text-text-muted">Valor</label>
      <div
        className={`flex h-16 min-w-0 items-center rounded-control border bg-surface-2 px-4 transition-colors ${
          amountFocused ? 'border-income/50' : 'border-border'
        }`}
      >
        <span className="num mr-1.5 text-[22px] text-text-faint">R$</span>
        <input
          id="recurring-expense-amount"
          inputMode="decimal"
          placeholder="0,00"
          value={form.amount}
          onFocus={() => setAmountFocused(true)}
          onBlur={() => setAmountFocused(false)}
          onChange={(event) => {
            const value = event.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
            set({ amount: value })
          }}
          className="num min-w-0 w-full flex-1 bg-transparent text-[28px] font-semibold text-text placeholder:text-text-faint outline-none"
          required
        />
      </div>
    </div>
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
