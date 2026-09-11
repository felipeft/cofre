const SHEET_SCHEMA_VERSION = 3
const SPREADSHEET_NAME = 'Cofre - Dados Financeiros'
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const TRANSACTIONS_MARKER = 'LANÇAMENTOS'
// Mantém leitura/limpeza até AD por uma versão para absorver planilhas v2;
// o layout v3 escreve apenas A:Z.
const MANAGED_LAST_COLUMN = 'AD'
const MANAGED_COLUMN_COUNT = 30
const VISIBLE_TRANSACTION_COLUMN_COUNT = 13

const TRANSACTION_HEADERS = [
  'ID', 'Data', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Pagamento', 'Cartão',
  'Parcela', 'Recorrente', 'Status', 'Tags', 'Observações',
  '_competence_year', '_competence_month', '_category_id', '_card_id',
  '_installment_current', '_installment_total', '_installment_group_id',
  '_recurring_expense_id', '_source', '_is_fixed', '_created_at', '_tags_json', '_export_hash',
]

module.exports = {
  SHEET_SCHEMA_VERSION, SPREADSHEET_NAME, MONTH_NAMES, TRANSACTIONS_MARKER,
  MANAGED_LAST_COLUMN, MANAGED_COLUMN_COUNT, VISIBLE_TRANSACTION_COLUMN_COUNT, TRANSACTION_HEADERS,
}
