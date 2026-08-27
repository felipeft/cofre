import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'

export default function CardForm({ initial, onSubmit, onCancel }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [creditLimit, setCreditLimit] = useState(initial?.creditLimit != null ? String(initial.creditLimit) : '')
  const [closingDay, setClosingDay] = useState(initial?.closingDay != null ? String(initial.closingDay) : '')
  const [dueDay, setDueDay] = useState(initial?.dueDay != null ? String(initial.dueDay) : '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim() || !creditLimit || !closingDay || !dueDay) return

    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        creditLimit: Number(creditLimit),
        closingDay: Number(closingDay),
        dueDay: Number(dueDay),
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input label="Nome do cartão" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" autoFocus />

      <Input
        label="Limite"
        type="number"
        inputMode="decimal"
        min="0.01"
        step="0.01"
        value={creditLimit}
        onChange={(e) => setCreditLimit(e.target.value)}
        placeholder="5000"
      />

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Fechamento (dia)"
          type="number"
          inputMode="numeric"
          min="1"
          max="31"
          value={closingDay}
          onChange={(e) => setClosingDay(e.target.value)}
          placeholder="10"
        />
        <Input
          label="Vencimento (dia)"
          type="number"
          inputMode="numeric"
          min="1"
          max="31"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
          placeholder="20"
        />
      </div>

      <div className="flex gap-3 mt-1">
        <Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" disabled={submitting}>
          {submitting ? 'Salvando…' : 'Salvar'}
        </Button>
      </div>
    </form>
  )
}
