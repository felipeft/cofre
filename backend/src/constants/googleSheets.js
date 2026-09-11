const SHEET_SCHEMA_VERSION = 2
const SPREADSHEET_NAME = 'Cofre - Dados Financeiros'
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const TRANSACTIONS_MARKER = 'LANÇAMENTOS'
const MANAGED_LAST_COLUMN = 'AD'

const TRANSACTION_HEADERS = [
  'ID', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Pagamento', 'Cartão',
  'Parcela', 'Recorrente', 'Status', 'Oferta', 'Dízimo', 'Tags', 'Observações',
  '_competence_year', '_competence_month', '_category_id', '_card_id',
  '_installment_current', '_installment_total', '_installment_group_id',
  '_recurring_expense_id', '_offer_rate_applied', '_tithe_rate_applied',
  '_source', '_is_fixed', '_created_at', '_tags_json', '_export_hash',
]

module.exports = {
  SHEET_SCHEMA_VERSION, SPREADSHEET_NAME, MONTH_NAMES, TRANSACTIONS_MARKER,
  MANAGED_LAST_COLUMN, TRANSACTION_HEADERS,
}
