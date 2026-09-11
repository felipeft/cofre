import { ChevronLeft, ChevronRight } from 'lucide-react'
import { monthCompactLabel } from '@/utils/months'

export default function MonthNavigator({ month, onPrevious, onNext, onReset, isCurrentMonth, canGoPrevious = true, canGoNext = true }) {
  return (
    <div className="flex h-10 items-center rounded-control border border-border bg-surface-2 p-1" aria-label="Selecionar mês">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="focus-ring flex size-8 items-center justify-center rounded-[7px] text-text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:pointer-events-none disabled:opacity-30"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className={`focus-ring min-w-[82px] px-1 text-center text-[12px] font-medium ${isCurrentMonth ? 'text-text' : 'text-income'}`}
        title={isCurrentMonth ? 'Mês atual' : 'Voltar ao mês atual'}
        aria-label={`${monthCompactLabel(month)}. ${isCurrentMonth ? 'Mês atual' : 'Voltar ao mês atual'}`}
      >
        {monthCompactLabel(month)}
      </button>
      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="focus-ring flex size-8 items-center justify-center rounded-[7px] text-text-muted transition-colors hover:bg-surface-3 hover:text-text disabled:pointer-events-none disabled:opacity-30"
        aria-label="Próximo mês"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  )
}
