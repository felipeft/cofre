import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency, formatPercentage } from '@/utils/formatters'

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="rounded-[8px] bg-surface-3 border border-border px-3 py-2 text-[12px]">
      <p className="text-text font-medium">{item.name}</p>
      <p className="num text-text-muted">{formatCurrency(item.value)}</p>
      {item.payload.incomePercentage !== undefined && (
        <p className="num text-text-muted">{formatPercentage(item.payload.incomePercentage)} da receita</p>
      )}
    </div>
  )
}

export default function CategoryPieChart({ data, showIncomeComparison = false }) {
  if (!data.length) {
    return <div className="h-[220px] flex items-center justify-center text-text-faint text-[13px]">Sem dados neste período</div>
  }

  return (
    <div>
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
      {showIncomeComparison && <div className="grid grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
        {data.map((item) => (
          <div key={item.name} className="flex min-w-0 items-center gap-2 text-[12px]">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="min-w-0 flex-1 truncate text-text-muted">{item.name}</span>
            <span className="num shrink-0 font-medium text-text">{formatPercentage(item.incomePercentage)}</span>
          </div>
        ))}
      </div>}
    </div>
  )
}
