import { CheckCircle2, AlertTriangle, Info } from 'lucide-react'

const icons = {
  default: CheckCircle2,
  error: AlertTriangle,
  info: Info,
}

const colors = {
  default: 'text-income',
  error: 'text-expense',
  info: 'text-info',
}

export default function Toast({ message, variant = 'default' }) {
  const Icon = icons[variant] ?? icons.default
  return (
    <div className="pointer-events-auto flex items-center gap-2.5 rounded-control bg-surface-3 border border-border px-4 py-3 shadow-[0_8px_30px_rgba(0,0,0,0.4)] animate-[toast-in_0.2s_ease-out]">
      <Icon size={16} className={colors[variant] ?? colors.default} />
      <span className="text-[14px] text-text">{message}</span>
    </div>
  )
}
