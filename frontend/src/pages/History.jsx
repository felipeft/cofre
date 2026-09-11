import { useEffect, useState } from 'react'
import { Search, ArrowUpDown, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react'
import Header from '@/layout/Header'
import Card from '@/components/ui/Card'
import Select from '@/components/ui/Select'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Dialog from '@/components/ui/Dialog'
import EmptyState from '@/components/ui/EmptyState'
import CategoryIcon from '@/components/ui/CategoryIcon'
import { Spinner, SkeletonRow } from '@/components/ui/Loading'
import TransactionForm from '@/components/forms/TransactionForm'
import { useTransactions } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useToast } from '@/contexts/ToastContext'
import { useTransactionsList } from '@/hooks/useTransactionsList'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { monthKey, parseMonthKey } from '@/utils/months'
import { getTransactionDeletionPreview } from '@/services/transaction.service'

function localDateInput(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export default function History() {
  const { updateTransaction, deleteTransaction } = useTransactions()
  const { categories } = useCategories()
  const { showToast } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sort, setSort] = useState('date-desc')
  const [periodFilter, setPeriodFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState(monthKey())
  const [exactDate, setExactDate] = useState(localDateInput())
  const [dateFrom, setDateFrom] = useState(`${monthKey()}-01`)
  const [dateTo, setDateTo] = useState(localDateInput())
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  // Espera o usuário parar de digitar antes de disparar a busca — evita uma
  // requisição por tecla pressionada.
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(timeout)
  }, [searchInput])

  // Qualquer mudança de filtro/ordenação/busca volta para a primeira página.
  useEffect(() => {
    setPage(1)
  }, [search, typeFilter, categoryFilter, sort, periodFilter, monthFilter, exactDate, dateFrom, dateTo])

  const selectedMonth = /^\d{4}-\d{2}$/.test(monthFilter) ? parseMonthKey(monthFilter) : null
  const periodQuery = {
    month: periodFilter === 'month' ? selectedMonth?.month : undefined,
    year: periodFilter === 'month' ? selectedMonth?.year : undefined,
    dateFrom: periodFilter === 'exact' ? exactDate : periodFilter === 'range' ? dateFrom || undefined : undefined,
    dateTo: periodFilter === 'exact' ? exactDate : periodFilter === 'range' ? dateTo || undefined : undefined,
  }

  const { data: filtered, meta, loading, error } = useTransactionsList({
    search,
    typeFilter,
    categoryFilter,
    sort,
    page,
    ...periodQuery,
  })

  const clearPeriod = () => {
    setPeriodFilter('all')
    setMonthFilter(monthKey())
    setExactDate(localDateInput())
    setDateFrom(`${monthKey()}-01`)
    setDateTo(localDateInput())
  }

  const handleUpdate = async (patch) => {
    try {
      await updateTransaction(editing.id, { ...patch, amount: Number(patch.amount) })
      setEditing(null)
      showToast('Movimentação atualizada')
    } catch (err) {
      showToast(err.message ?? 'Não foi possível atualizar a movimentação.', 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await deleteTransaction(deleting.item.id)
      showToast('Movimentação excluída', 'info')
    } catch (err) {
      showToast(err.message ?? 'Não foi possível excluir a movimentação.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const prepareDelete = async (item) => {
    setDeleting({ item, preview: null, loading: true })
    try {
      const preview = await getTransactionDeletionPreview(item.id)
      setDeleting((current) => current?.item.id === item.id ? { item, preview, loading: false } : current)
    } catch (err) {
      showToast(err.message ?? 'Não foi possível calcular o impacto da exclusão.', 'error')
      setDeleting(null)
    }
  }

  return (
    <div>
      <Header title="Histórico" subtitle={`${meta.total} movimentações`} />

      <div className="px-5 md:px-8 pb-8 flex flex-col gap-4">
        {/* Filters */}
        <Card className="p-3 md:p-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_180px_180px] gap-3">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-faint" />
              <input
                placeholder="Buscar por descrição, categoria ou observações"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="focus-ring h-11 w-full rounded-control bg-surface-2 border border-border pl-9 pr-3.5 text-[14px] text-text placeholder:text-text-faint focus:border-income/50 transition-colors"
              />
            </div>
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">Todos os tipos</option>
              <option value="income">Receitas</option>
              <option value="expense">Despesas</option>
            </Select>
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
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

          <div className="mt-3 grid grid-cols-1 items-end gap-3 sm:grid-cols-2 lg:grid-cols-[220px_minmax(220px,440px)_auto]">
            <Select label="Período" value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value)}>
              <option value="all">Todas as datas</option>
              <option value="month">Mês específico</option>
              <option value="exact">Data específica</option>
              <option value="range">Intervalo personalizado</option>
            </Select>

            {periodFilter === 'month' && (
              <Input label="Mês e ano" type="month" min="2000-01" max="2100-12" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
            )}
            {periodFilter === 'exact' && (
              <Input label="Data" type="date" min="2000-01-01" max="2100-12-31" value={exactDate} onChange={(e) => setExactDate(e.target.value)} />
            )}
            {periodFilter === 'range' && (
              <div className="grid grid-cols-2 gap-3">
                <Input label="De" type="date" min="2000-01-01" max={dateTo || '2100-12-31'} value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input label="Até" type="date" min={dateFrom || '2000-01-01'} max="2100-12-31" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            )}

            {periodFilter !== 'all' && (
              <Button variant="ghost" icon={X} onClick={clearPeriod} className="justify-self-start">
                Limpar período
              </Button>
            )}
          </div>
        </Card>

        {error ? (
          <Card>
            <EmptyState
              icon={ArrowUpDown}
              title="Não foi possível carregar o histórico"
              description={error.message ?? 'Tente novamente em instantes.'}
            />
          </Card>
        ) : loading && filtered.length === 0 ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} className="h-16" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
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
                    <p className="text-[12px] text-text-muted truncate">
                      {t.category.name} · {formatDate(t.date)}
                      {t.card && (
                        <>
                          {' · '}
                          {t.card.name}
                          {t.installments && t.installments.total > 1 ? ` ${t.installments.current}/${t.installments.total}` : ''}
                        </>
                      )}
                      {t.recurringExpenseId && <> · Recorrente</>}
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
                    <button onClick={() => prepareDelete(t)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10" aria-label="Excluir">
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
                      <td className="py-3 px-4 text-[14px] text-text">
                        {t.description || t.category.name}
                        {t.card && (
                          <span className="block text-[11px] text-text-faint">
                            {t.card.name}
                            {t.installments && t.installments.total > 1 ? ` · ${t.installments.current}/${t.installments.total}` : ''}
                          </span>
                        )}
                        {t.recurringExpenseId && <span className="block text-[11px] text-text-faint">Recorrente</span>}
                      </td>
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
                          <button onClick={() => prepareDelete(t)} className="focus-ring rounded-[6px] p-1.5 text-text-faint hover:text-expense hover:bg-expense/10" aria-label="Excluir">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="flex items-center justify-between px-1">
                <span className="text-[13px] text-text-muted flex items-center gap-2">
                  Página {meta.page} de {meta.totalPages}
                  {loading && <Spinner size={14} />}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronLeft}
                    iconOnly
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="Página anterior"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={ChevronRight}
                    iconOnly
                    disabled={page >= meta.totalPages}
                    onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                    aria-label="Próxima página"
                  />
                </div>
              </div>
            )}
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
        description={deleting?.loading
          ? 'Calculando o impacto da exclusão…'
          : `"${deleting?.item.description || deleting?.item.category?.name}" será removida definitivamente.${deleting?.preview?.cardLimitReduction ? ` O limite do cartão será liberado em ${formatCurrency(deleting.preview.cardLimitReduction)}.` : ''}${deleting?.preview?.isRecurringOccurrence ? ' Esta ocorrência não será recriada automaticamente.' : ''}${deleting?.preview?.deletesOnlyThisInstallment ? ` Somente esta parcela será apagada; as outras ${deleting.preview.installmentGroupSize - 1} permanecerão.` : ''}`}
        confirmLabel="Excluir"
        confirmDisabled={deleting?.loading || !deleting?.preview}
      />
    </div>
  )
}
