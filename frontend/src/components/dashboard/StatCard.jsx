import Card from '@/components/ui/Card'
import { formatCurrency } from '@/utils/formatters'

const toneStyles = {
  neutral: 'text-text',
  income: 'text-income',
  expense: 'text-expense',
  info: 'text-info',
}

export default function StatCard({ label, value, icon: Icon, tone = 'neutral', hint }) {
  return (
    <Card className="p-4 md:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-text-muted font-medium">{label}</span>
        {Icon && <Icon size={16} className="text-text-faint" strokeWidth={2} />}
      </div>
      <span className={`num text-[22px] md:text-[26px] font-semibold tracking-tight ${toneStyles[tone]}`}>
        {formatCurrency(value)}
      </span>
      {hint && <span className="text-[12px] text-text-faint">{hint}</span>}
    </Card>
  )
}
