import CategoryIcon from '@/components/ui/CategoryIcon'
import { formatCurrency, relativeDayLabel } from '@/utils/formatters'
import { Pencil, Trash2 } from 'lucide-react'

export default function TransactionRow({ transaction, onEdit, onDelete, showActions = false }) {
  const { category, type, amount, description, date } = transaction
  const isIncome = type === 'income'

  return (
    <div className="group flex items-center gap-3 py-3 px-1">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: `${category.color}1a`, color: category.color }}
      >
        <CategoryIcon name={category.icon} size={18} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-text truncate">{description || category.name}</p>
        <p className="text-[12px] text-text-muted">
          {category.name} · {relativeDayLabel(date)}
        </p>
      </div>

      <span className={`num text-[14px] font-semibold shrink-0 ${isIncome ? 'text-income' : 'text-text'}`}>
        {isIncome ? '+' : '-'}
        {formatCurrency(amount)}
      </span>

      {showActions && (
        <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1">
          <button
            onClick={() => onEdit?.(transaction)}
            className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-text hover:bg-surface-2"
            aria-label="Editar"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete?.(transaction)}
            className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10"
            aria-label="Excluir"
          >
            <Trash2 size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
