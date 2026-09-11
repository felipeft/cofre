import Header from '@/layout/Header'
import Card from '@/components/ui/Card'
import CategoryIcon from '@/components/ui/CategoryIcon'
import CategoryPieChart from '@/components/charts/CategoryPieChart'
import MonthlyBarChart from '@/components/charts/MonthlyBarChart'
import TrendLineChart from '@/components/charts/TrendLineChart'
import EmptyState from '@/components/ui/EmptyState'
import MonthNavigator from '@/components/ui/MonthNavigator'
import { SkeletonRow } from '@/components/ui/Loading'
import { useAnalytics } from '@/hooks/useAnalytics'
import { useSelectedMonth } from '@/hooks/useSelectedMonth'
import { formatCurrency, formatDate, formatPercentage } from '@/utils/formatters'
import { monthLongLabel } from '@/utils/months'

export default function Analytics() {
  const monthSelection = useSelectedMonth()
  const { selectedMonth } = monthSelection
  const { breakdown, trend, summary, topExpenses, loading, error } = useAnalytics(selectedMonth)

  const pieData = breakdown.map((b) => ({ name: b.category.name, value: b.value, color: b.category.color, incomePercentage: b.incomePercentage }))
  const maxCategory = breakdown[0]?.value || 1
  const subtitle = `Visão detalhada de ${monthLongLabel(selectedMonth)}`
  const monthNavigator = (
    <MonthNavigator
      month={selectedMonth}
      onPrevious={monthSelection.previousMonth}
      onNext={monthSelection.nextMonth}
      onReset={monthSelection.resetMonth}
      isCurrentMonth={monthSelection.isCurrentMonth}
      canGoPrevious={monthSelection.canGoPrevious}
      canGoNext={monthSelection.canGoNext}
    />
  )

  if (error) {
    return (
      <div>
        <Header title="Análises" subtitle={subtitle} actions={monthNavigator} />
        <div className="px-5 md:px-8 pb-8">
          <Card>
            <EmptyState title="Não foi possível carregar as análises" description={error.message ?? 'Tente novamente em instantes.'} />
          </Card>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div>
        <Header title="Análises" subtitle={subtitle} actions={monthNavigator} />
        <div className="px-5 md:px-8 pb-8 flex flex-col gap-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SkeletonRow className="h-64" />
            <SkeletonRow className="h-64" />
          </div>
          <SkeletonRow className="h-56" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Análises" subtitle={subtitle} actions={monthNavigator} />

      <div className="px-5 md:px-8 pb-8 flex flex-col gap-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 md:p-5">
            <h3 className="text-[15px] font-semibold text-text mb-2">Distribuição das despesas</h3>
            <p className="text-[11px] text-text-faint">Percentuais em relação às receitas do mês</p>
            <CategoryPieChart data={pieData} showIncomeComparison />
          </Card>

          <Card className="p-4 md:p-5">
            <h3 className="text-[15px] font-semibold text-text mb-2">Saldo ao longo do tempo</h3>
            <TrendLineChart data={trend} />
          </Card>
        </div>

        <Card className="p-4 md:p-5">
          <h3 className="text-[15px] font-semibold text-text mb-2">Receitas vs. despesas por mês</h3>
          <MonthlyBarChart data={trend} />
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4 md:p-5">
            <h3 className="text-[15px] font-semibold text-text mb-3">Gasto por categoria (barras)</h3>
            <div className="flex flex-col gap-3">
              {breakdown.map((b) => (
                <div key={b.categoryId} className="flex items-center gap-3">
                  <CategoryIcon name={b.category.icon} size={15} className="shrink-0" style={{ color: b.category.color }} />
                  <span className="text-[13px] text-text-muted w-24 shrink-0 truncate">{b.category.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(b.value / maxCategory) * 100}%`, backgroundColor: b.category.color }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right">
                    <span className="num block text-[12px] text-text-muted">{formatCurrency(b.value)}</span>
                    <span className="num block text-[10px] text-text-faint">{formatPercentage(b.incomePercentage)} da receita</span>
                  </span>
                </div>
              ))}
              {breakdown.length === 0 && (
                <p className="text-[13px] text-text-faint">Sem despesas neste período.</p>
              )}
            </div>
          </Card>

          <Card className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-text">Maiores gastos do mês</h3>
              <span className="text-[12px] text-text-faint">Total: {formatCurrency(summary.expense)}</span>
            </div>
            <div className="flex flex-col divide-y divide-border-soft">
              {topExpenses.map((t, i) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="num text-[12px] text-text-faint w-4">{i + 1}</span>
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${t.category.color}1a`, color: t.category.color }}
                  >
                    <CategoryIcon name={t.category.icon} size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-text truncate">{t.description || t.category.name}</p>
                    <p className="text-[11px] text-text-muted">{formatDate(t.date)}</p>
                  </div>
                  <span className="shrink-0 text-right">
                    <span className="num block text-[13px] font-semibold text-text">{formatCurrency(t.amount)}</span>
                    <span className="num block text-[10px] text-text-faint">{formatPercentage(t.incomePercentage)} da receita</span>
                  </span>
                </div>
              ))}
              {topExpenses.length === 0 && <p className="text-[13px] text-text-faint py-2">Sem despesas neste período.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
