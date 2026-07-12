import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/utils/formatters'
import { SEMANTIC_COLORS, CHART_GRID_COLOR, CHART_TICK_COLOR } from '@/constants/colors'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[8px] bg-surface-3 border border-border px-3 py-2 text-[12px]">
      <p className="text-text font-medium mb-1">{label}</p>
      <p className="num text-info">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

export default function TrendLineChart({ data }) {
  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="saldoGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SEMANTIC_COLORS.info} stopOpacity={0.35} />
              <stop offset="100%" stopColor={SEMANTIC_COLORS.info} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART_GRID_COLOR} strokeDasharray="3 3" />
          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART_TICK_COLOR, fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Area type="monotone" dataKey="saldo" stroke={SEMANTIC_COLORS.info} strokeWidth={2} fill="url(#saldoGradient)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
