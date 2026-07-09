import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Wallet, TrendingDown, TrendingUp, ArrowRight, Tags, History } from 'lucide-react'
import Header from '@/components/layout/Header'
import Card from '@/components/ui/Card'
import StatCard from '@/components/dashboard/StatCard'
import TransactionRow from '@/components/transactions/TransactionRow'
import CategoryPieChart from '@/components/charts/CategoryPieChart'
import MonthlyBarChart from '@/components/charts/MonthlyBarChart'
import EmptyState from '@/components/ui/EmptyState'
import { useTransactions } from '@/context/TransactionsContext'
import { getCategory } from '@/services/mockCategories'
import {
  getMonthSummary,
  getCategoryBreakdown,
  getMonthlyTrend,
  getRecentTransactions,
} from '@/utils/aggregations'

export default function Dashboard() {
  const { transactions } = useTransactions()
  const navigate = useNavigate()

  const summary = useMemo(() => getMonthSummary(transactions), [transactions])
  const breakdown = useMemo(() => getCategoryBreakdown(transactions), [transactions])
  const trend = useMemo(() => getMonthlyTrend(transactions, 6), [transactions])
  const recent = useMemo(
    () => getRecentTransactions(transactions, 6).map((t) => ({ ...t, category: getCategory(t.categoryId) })),
    [transactions]
  )

  const pieData = breakdown
    .slice(0, 6)
    .map((b) => ({ name: b.category.name, value: b.value, color: b.category.color }))

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <Header title="Início" subtitle={`Resumo de ${monthName}`} />

      <div className="px-5 md:px-8 pb-8 flex flex-col gap-6">
        {/* Summary stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <StatCard label="Saldo do mês" value={summary.balance} icon={Wallet} tone={summary.balance >= 0 ? 'income' : 'expense'} />
          <StatCard label="Receitas" value={summary.income} icon={TrendingUp} tone="income" />
          <StatCard label="Despesas" value={summary.expense} icon={TrendingDown} tone="expense" />
        </div>

        {/* Quick shortcuts */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ShortcutButton icon={History} label="Histórico" onClick={() => navigate('/historico')} />
          <ShortcutButton icon={Tags} label="Categorias" onClick={() => navigate('/categorias')} />
          <ShortcutButton icon={TrendingUp} label="Análises" onClick={() => navigate('/analitico')} />
          <ShortcutButton icon={Wallet} label="Ajustes" onClick={() => navigate('/configuracoes')} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Recent transactions */}
          <Card className="lg:col-span-3 p-4 md:p-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[15px] font-semibold text-text">Últimos lançamentos</h3>
              <button
                onClick={() => navigate('/historico')}
                className="focus-ring flex items-center gap-1 text-[13px] text-text-muted hover:text-text transition-colors"
              >
                Ver tudo <ArrowRight size={14} />
              </button>
            </div>
            {recent.length ? (
              <div className="divide-y divide-border-soft">
                {recent.map((t) => (
                  <TransactionRow key={t.id} transaction={t} />
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhum lançamento ainda" description="Registre sua primeira movimentação para ver o resumo aqui." />
            )}
          </Card>

          {/* Category breakdown */}
          <Card className="lg:col-span-2 p-4 md:p-5">
            <h3 className="text-[15px] font-semibold text-text mb-2">Despesas por categoria</h3>
            <CategoryPieChart data={pieData} />
            <div className="flex flex-col gap-2 mt-2">
              {breakdown.slice(0, 5).map((b) => (
                <div key={b.categoryId} className="flex items-center justify-between text-[13px]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: b.category.color }} />
                    <span className="text-text-muted">{b.category.name}</span>
                  </div>
                  <span className="num text-text">{((b.value / (summary.expense || 1)) * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Monthly evolution */}
        <Card className="p-4 md:p-5">
          <h3 className="text-[15px] font-semibold text-text mb-2">Evolução mensal</h3>
          <MonthlyBarChart data={trend} />
        </Card>
      </div>
    </div>
  )
}

function ShortcutButton({ icon: Icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex items-center gap-2.5 rounded-card bg-surface border border-border-soft px-4 h-14 text-[14px] font-medium text-text-muted hover:text-text hover:border-border transition-colors"
    >
      <Icon size={17} strokeWidth={2} />
      {label}
    </button>
  )
}
