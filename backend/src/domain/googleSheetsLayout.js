const { MONTH_NAMES, TRANSACTIONS_MARKER, TRANSACTION_HEADERS, SHEET_SCHEMA_VERSION } = require('../constants/googleSheets')
const { transactionToSheetRow } = require('../utils/mappers/googleSheets.mapper')

function sum(rows, field) { return Number(rows.reduce((total, row) => total + Number(row[field] || 0), 0).toFixed(2)) }
function totals(rows) {
  const active = rows.filter((row) => row.status !== 'cancelled')
  const income = sum(active.filter((row) => row.type === 'income'), 'amount')
  const expense = sum(active.filter((row) => row.type === 'expense'), 'amount')
  const offer = sum(active, 'offer_amount'); const tithe = sum(active, 'tithe_amount')
  return { income, expense, balance: Number((income - expense - offer - tithe).toFixed(2)), offer, tithe }
}
function buildYearSheet({ year, transactions, categories, now, userId }) {
  const annual = totals(transactions)
  const title = [`COFRE · ${year}`]
  title[15] = 'cofre_schema_version'; title[16] = SHEET_SCHEMA_VERSION
  title[17] = 'cofre_user_id'; title[18] = userId
  title[19] = 'cofre_year'; title[20] = year
  const rows = [title, [`Visão financeira anual · última sincronização ${new Date(now).toLocaleString('pt-BR', { timeZone: 'America/Fortaleza' })}`], [],
    ['RESUMO ANUAL', '', 'Receitas', annual.income, 'Despesas', annual.expense, 'Saldo', annual.balance, 'Oferta', annual.offer, 'Dízimo', annual.tithe], [],
    ['RESUMO MENSAL'], ['Mês', 'Receitas', 'Despesas', 'Saldo', 'Oferta', 'Dízimo']]
  for (let month = 1; month <= 12; month += 1) {
    const value = totals(transactions.filter((row) => Number(row.competence_month) === month))
    rows.push([MONTH_NAMES[month - 1], value.income, value.expense, value.balance, value.offer, value.tithe])
  }
  rows.push([], ['GASTOS POR CATEGORIA E MÊS'], ['Categoria', ...MONTH_NAMES.map((name) => name.slice(0, 3)), 'Total'])
  const expenseCategories = categories.filter((category) => category.type === 'expense')
  for (const category of expenseCategories) {
    const amounts = Array.from({ length: 12 }, (_, index) => sum(transactions.filter((row) => row.type === 'expense' && row.status !== 'cancelled' && Number(row.category_id) === Number(category.id) && Number(row.competence_month) === index + 1), 'amount'))
    rows.push([category.name, ...amounts, Number(amounts.reduce((total, value) => total + value, 0).toFixed(2))])
  }
  rows.push([])
  const markerRow = rows.length; rows.push([TRANSACTIONS_MARKER, 'Para adicionar uma despesa, preencha Data, Descrição, Categoria e Valor na primeira linha vazia.'])
  const headerRow = rows.length; rows.push(TRANSACTION_HEADERS)
  transactions.forEach((transaction) => rows.push(transactionToSheetRow(transaction)))
  return { values: rows, markerRow, headerRow, firstTransactionRow: headerRow + 1, categoryHeaderRow: 21, firstCategoryRow: 22, categoryCount: expenseCategories.length }
}
module.exports = { buildYearSheet, totals }
