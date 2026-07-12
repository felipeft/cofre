import { useMemo, useState } from 'react'
import { Search, ArrowUpDown, Pencil, Trash2 } from 'lucide-react'
import Header from '@/layout/Header'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Modal from '@/components/ui/Modal'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import CategoryIcon from '@/components/ui/CategoryIcon'
import TransactionForm from '@/components/forms/TransactionForm'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/contexts/ToastContext'
import { filterAndSortTransactions } from '@/utils/transactionFilters'
import { formatCurrency, formatDate } from '@/utils/formatters'

export default function History() {
  const { transactions, updateTransaction, deleteTransaction } = useTransactions()
  const { categories, getCategoryById } = useCategories()
  const { showToast } = useToast()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('date-desc')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const filtered = useMemo(() => {
    const enriched = transactions.map((t) => ({ ...t, category: getCategoryById(t.categoryId) }))
    return filterAndSortTransactions(enriched, { search, typeFilter, categoryFilter, sort })
  }, [transactions, getCategoryById, search, typeFilter, categoryFilter, sort])

  const handleUpdate = (patch) => {
    updateTransaction(editing.id, { ...patch, amount: Number(patch.amount) })
    setEditing(null)
    showToast('Movimentação atualizada')
  }

  const handleDelete = () => {
    deleteTransaction(deleting.id)
    showToast('Movimentação excluída', 'info')
    setDeleting(null)
  }

  return (
    <div>
      <Header title="Histórico" subtitle={`${filtered.length} movimentações`} />

      <div className="px-5 md:px-8 pb-8 flex flex-col gap-4">
        {/* Filters */}
        <Card className="p-3 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_180px_180px] gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                placeholder="Buscar por descrição ou categoria"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="focus-ring h-11 w-full rounded-control bg-surface-2 border border-border pl-9 pr-3.5 text-[14px] text-text placeholder:text-text-faint focus:border-income/50 transition-colors"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </Select>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Todas as categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
            <Select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="date-desc">Mais recentes</option>
              <option value="date-asc">Mais antigas</option>
              <option value="amount-desc">Maior valor</option>
              <option value="amount-asc">Menor valor</option>
            </Select>
          </div>
        </Card>

        {filtered.length === 0 ? (
          <Card>
            <EmptyState
              icon={ArrowUpDown}
              title="Nenhuma movimentação encontrada"
              description="Tente ajustar os filtros ou o termo de busca."
            />
          </Card>
        ) : (
          <>
            {/* Mobile: cards */}
            <div className="md:hidden flex flex-col gap-2">
              {filtered.map((t) => (
                <Card key={t.id} className="p-3 flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${t.category.color}1a`, color: t.category.color }}
                  >
                    <CategoryIcon name={t.category.icon} size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium text-text truncate">{t.description || t.category.name}</p>
                    <p className="text-[12px] text-text-muted">
                      {t.category.name} · {formatDate(t.date)}
                    </p>
                  </div>
                  <span className={`num text-[14px] font-semibold shrink-0 ${t.type === 'income' ? 'text-income' : 'text-text'}`}>
                    {t.type === 'income' ? '+' : '-'}
                    {formatCurrency(t.amount)}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setEditing(t)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-text hover:bg-surface-2" aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleting(t)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10" aria-label="Excluir">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Desktop: table */}
            <Card className="hidden md:block overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border-soft text-[12px] text-text-faint uppercase tracking-wide">
                    <th className="font-medium py-3 px-4">Descrição</th>
                    <th className="font-medium py-3 px-4">Categoria</th>
                    <th className="font-medium py-3 px-4">Data</th>
                    <th className="font-medium py-3 px-4 text-right">Valor</th>
                    <th className="font-medium py-3 px-4 w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="group border-b border-border-soft last:border-0 hover:bg-surface-2/50 transition-colors">
                      <td className="py-3 px-4 text-[14px] text-text">{t.description || t.category.name}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[13px] text-text-muted">
                          <CategoryIcon name={t.category.icon} size={14} className="shrink-0" />
                          {t.category.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[13px] text-text-muted">{formatDate(t.date)}</td>
                      <td className={`num py-3 px-4 text-[14px] font-semibold text-right ${t.type === 'income' ? 'text-income' : 'text-text'}`}>
                        {t.type === 'income' ? '+' : '-'}
                        {formatCurrency(t.amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="hidden group-hover:flex items-center gap-1 justify-end">
                          <button onClick={() => setEditing(t)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-text hover:bg-surface-2" aria-label="Editar">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => setDeleting(t)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10" aria-label="Excluir">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </>
        )}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar movimentação">
        {editing && (
          <TransactionForm
            initial={{ ...editing, amount: String(editing.amount) }}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            submitLabel="Salvar alterações"
          />
        )}
      </Modal>

      <Dialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        title="Excluir movimentação"
        description={`Tem certeza que deseja excluir "${deleting?.description || deleting?.category?.name}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
      />
    </div>
  )
}
