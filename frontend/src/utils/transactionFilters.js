// Lógica pura de busca/filtro/ordenação — não sabe de onde vêm as
// transações nem como a UI as exibe, então pode ser reutilizada (e testada)
// fora da página de Histórico.
export function filterAndSortTransactions(transactions, { search = '', typeFilter = 'all', categoryFilter = 'all', sort = 'date-desc' } = {}) {
  let items = transactions

  if (search.trim()) {
    const q = search.toLowerCase()
    items = items.filter(
      (t) => t.description?.toLowerCase().includes(q) || t.category.name.toLowerCase().includes(q)
    )
  }
  if (typeFilter !== 'all') items = items.filter((t) => t.type === typeFilter)
  if (categoryFilter !== 'all') items = items.filter((t) => t.categoryId === categoryFilter)

  return [...items].sort((a, b) => {
    if (sort === 'date-desc') return a.date < b.date ? 1 : -1
    if (sort === 'date-asc') return a.date > b.date ? 1 : -1
    if (sort === 'amount-desc') return b.amount - a.amount
    if (sort === 'amount-asc') return a.amount - b.amount
    return 0
  })
}
