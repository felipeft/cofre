const repository = require('../repositories/dataManagement.repository')

const OPERATIONS = {
  'clear-records': {
    confirmationPhrase: 'LIMPAR REGISTROS',
    affected: ['transactions', 'cardPayments', 'sheetImports', 'syncRuns'],
  },
  reset: {
    confirmationPhrase: 'RESETAR COFRE',
    affected: ['transactions', 'recurringExpenses', 'categories', 'cards', 'cardPayments', 'sheetImports', 'syncRuns'],
  },
}

function currentMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function mapCounts(row) {
  return {
    transactions: Number(row.transactions),
    recurringExpenses: Number(row.recurring_expenses),
    categories: Number(row.categories),
    cards: Number(row.cards),
    cardPayments: Number(row.card_payments),
    sheetImports: Number(row.sheet_imports),
    syncRuns: Number(row.sync_runs),
  }
}

async function getPreview(userId, operation) {
  const config = OPERATIONS[operation]
  const row = await repository.preview(userId)
  const counts = mapCounts(row)
  const deleteCounts = Object.fromEntries(config.affected.map((key) => [key, counts[key]]))
  return {
    operation,
    counts: deleteCounts,
    totalRecords: Object.values(deleteCounts).reduce((total, count) => total + count, 0),
    preservesAccount: true,
    preservesSettings: true,
    preservesStructure: operation === 'clear-records',
    spreadsheetWillBeOverwritten: Boolean(row.has_spreadsheet),
    confirmationPhrase: config.confirmationPhrase,
  }
}

async function clearFinancialRecords(userId) {
  const row = await repository.clearFinancialRecords(userId, currentMonthStart())
  return { deleted: mapCounts(row), spreadsheetRequiresExport: Boolean(row.has_spreadsheet) }
}

async function resetCofre(userId) {
  const row = await repository.reset(userId)
  return { deleted: mapCounts(row), spreadsheetRequiresExport: Boolean(row.has_spreadsheet) }
}

module.exports = { getPreview, clearFinancialRecords, resetCofre }
