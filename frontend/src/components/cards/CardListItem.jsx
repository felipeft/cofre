import { Pencil, Trash2, CreditCard, WalletCards } from 'lucide-react'
import Card from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatters'

export default function CardListItem({ card, summary, onEdit, onDelete, onPay }) {
  const usedRatio = summary ? Math.min(summary.usedLimit / summary.creditLimit, 1) : 0
  const isOverLimit = summary && summary.availableLimit < 0

  return (
    <Card className="group p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/15 text-info">
          <CreditCard size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-text truncate">{card.name}</p>
          <p className="text-[12px] text-text-muted">
            Fecha dia {card.closingDay} · Vence dia {card.dueDay}
          </p>
          {!card.isActive && <p className="text-[11px] text-text-faint">Inativo</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {summary?.usedLimit > 0 && <button onClick={() => onPay(card, summary)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-income hover:bg-income/10" aria-label="Registrar pagamento da fatura"><WalletCards size={14} /></button>}
          <button onClick={() => onEdit(card)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-text hover:bg-surface-2" aria-label="Editar">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(card)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10" aria-label="Excluir">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {summary && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${isOverLimit ? 'bg-expense' : 'bg-info'}`}
              style={{ width: `${usedRatio * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-text-muted">
              Usado <span className="num text-text">{formatCurrency(summary.usedLimit)}</span>
            </span>
            <span className="text-text-muted">
              Disponível{' '}
              <span className={`num ${isOverLimit ? 'text-expense' : 'text-text'}`}>{formatCurrency(summary.availableLimit)}</span>
            </span>
          </div>
          <div className="text-[11px] text-text-faint">Limite total {formatCurrency(summary.creditLimit)}</div>
          {summary.paidAmount > 0 && <div className="text-[11px] text-text-faint">Pagamentos registrados {formatCurrency(summary.paidAmount)}</div>}
        </div>
      )}
    </Card>
  )
}
