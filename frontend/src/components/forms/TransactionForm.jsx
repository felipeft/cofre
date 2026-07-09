import { useState } from 'react'
import Input from '@/components/ui/Input'
import Select from '@/components/ui/Select'
import Button from '@/components/ui/Button'
import { mockCategories } from '@/services/mockCategories'
import { formatDateInput } from '@/utils/formatters'

const defaultState = {
  type: 'expense',
  amount: '',
  categoryId: 'mercado',
  description: '',
  date: formatDateInput(),
}

export default function TransactionForm({ initial, onSubmit, onCancel, submitLabel = 'Salvar' }) {
  const [form, setForm] = useState(initial ?? defaultState)
  const [amountFocused, setAmountFocused] = useState(false)

  const categories = mockCategories.filter((c) => c.type === form.type)

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleTypeChange = (type) => {
    const firstOfType = mockCategories.find((c) => c.type === type)
    set({ type, categoryId: firstOfType?.id })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) return
    onSubmit({ ...form, amount: Number(form.amount) })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 rounded-control bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => handleTypeChange('expense')}
          className={`focus-ring h-10 rounded-[8px] text-[14px] font-medium transition-colors ${
            form.type === 'expense' ? 'bg-expense/15 text-expense' : 'text-text-muted'
          }`}
        >
          Despesa
        </button>
        <button
          type="button"
          onClick={() => handleTypeChange('income')}
          className={`focus-ring h-10 rounded-[8px] text-[14px] font-medium transition-colors ${
            form.type === 'income' ? 'bg-income/15 text-income' : 'text-text-muted'
          }`}
        >
          Receita
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-text-muted">Valor</label>
        <div
          className={`flex items-center h-16 rounded-control bg-surface-2 border px-4 transition-colors ${
            amountFocused ? 'border-income/50' : 'border-border'
          }`}
        >
          <span className="num text-[22px] text-text-faint mr-1.5">R$</span>
          <input
            autoFocus
            inputMode="decimal"
            placeholder="0,00"
            value={form.amount}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            onChange={(e) => {
              const v = e.target.value.replace(',', '.').replace(/[^0-9.]/g, '')
              set({ amount: v })
            }}
            className="num flex-1 bg-transparent text-[28px] font-semibold text-text placeholder:text-text-faint outline-none"
          />
        </div>
      </div>

      <Select label="Categoria" value={form.categoryId} onChange={(e) => set({ categoryId: e.target.value })}>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>

      <Input
        label="Descrição"
        placeholder="Ex: Garrafão de água Tony"
        value={form.description}
        onChange={(e) => set({ description: e.target.value })}
      />

      <Input
        label="Data"
        type="date"
        value={form.date}
        onChange={(e) => set({ date: e.target.value })}
      />

      <div className="flex gap-3 mt-1">
        {onCancel && (
          <Button type="button" variant="ghost" className="flex-1" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" variant="primary" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
