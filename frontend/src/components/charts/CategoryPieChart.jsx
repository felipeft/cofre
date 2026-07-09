import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/utils/formatters'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-[8px] bg-surface-3 border border-border px-3 py-2 text-[12px]">
      <p className="text-text font-medium">{item.name}</p>
      <p className="num text-text-muted">{formatCurrency(item.value)}</p>
    </div>
  )
}

export default function CategoryPieChart({ data }) {
  if (!data.length) {
    return <div className="h-[220px] flex items-center justify-center text-text-faint text-[13px]">Sem dados neste período</div>
  }

  return (
    <div className="h-[220px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={90}
            paddingAngle={3}
            strokeWidth={0}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
