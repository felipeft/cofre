import { useState } from 'react'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import { formatDateInput } from '@/utils/formatters'

export default function CardPaymentForm({ card, summary, onSubmit, onCancel }) {
  const [amount, setAmount] = useState(String(summary.usedLimit))
  const [paidAt, setPaidAt] = useState(formatDateInput())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event) => {
    event.preventDefault(); setSubmitting(true)
    try { await onSubmit({ amount: Number(amount), paidAt, notes }) } finally { setSubmitting(false) }
  }
  return <form onSubmit={submit} className="flex flex-col gap-4">
    <p className="text-[13px] text-text-muted">Pagamento de {card.name}. As compras já registradas continuam sendo as despesas; este lançamento apenas quita o limite do cartão.</p>
    <Input label="Valor pago" type="number" min="0.01" max={summary.usedLimit} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
    <Input label="Data do pagamento" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} required />
    <Input label="Observações" value={notes} onChange={(e) => setNotes(e.target.value)} />
    <div className="flex gap-3"><Button type="button" variant="ghost" className="flex-1" onClick={onCancel} disabled={submitting}>Cancelar</Button><Button type="submit" className="flex-1" disabled={submitting || Number(amount) <= 0 || Number(amount) > summary.usedLimit}>{submitting ? 'Registrando…' : 'Registrar pagamento'}</Button></div>
  </form>
}
