import { BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import { formatCurrency } from '@/utils/formatters'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-[8px] bg-surface-3 border border-border px-3 py-2 text-[12px] space-y-1">
      <p className="text-text font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="num flex items-center gap-2" style={{ color: p.fill }}>
          {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function MonthlyBarChart({ data }) {
  return (
    <div className="h-[240px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} barGap={4} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#27272a" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8b8b93', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#1c1c1f' }} />
          <Bar dataKey="receitas" fill="#3ecf8e" radius={[4, 4, 0, 0]} maxBarSize={18} />
          <Bar dataKey="despesas" fill="#f2666a" radius={[4, 4, 0, 0]} maxBarSize={18} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
