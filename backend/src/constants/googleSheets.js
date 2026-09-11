const SHEET_SCHEMA_VERSION = 1
const SPREADSHEET_NAME = 'Cofre - Dados Financeiros'
const AUXILIARY_SHEETS = ['Metadata', 'Categorias', 'Cartões', 'Gastos Recorrentes', 'Pagamentos de Fatura', 'Configurações']

const TRANSACTION_HEADERS = [
  'transaction_id', 'date', 'competence_year', 'competence_month', 'type', 'description',
  'category_id', 'category_name', 'amount', 'payment_method', 'card_id', 'card_name',
  'installment_current', 'installment_total', 'installment_group_id', 'recurring_expense_id',
  'offer_amount', 'tithe_amount', 'offer_rate_applied', 'tithe_rate_applied', 'status',
  'source', 'is_recurring', 'is_fixed', 'tags_json', 'notes', 'created_at', 'updated_at',
]

const CATEGORY_HEADERS = ['category_id', 'name', 'type', 'color', 'icon', 'is_active', 'sort_order', 'apply_offer', 'offer_rate', 'apply_tithe', 'tithe_rate', 'created_at', 'updated_at']
const CARD_HEADERS = ['card_id', 'name', 'credit_limit', 'closing_day', 'due_day', 'is_active', 'created_at', 'updated_at']
const RECURRING_HEADERS = ['recurring_expense_id', 'description', 'amount', 'category_id', 'category_name', 'day_of_month', 'start_date', 'end_date', 'is_active', 'card_id', 'card_name', 'notes', 'source', 'created_at', 'updated_at']
const PAYMENT_HEADERS = ['payment_id', 'card_id', 'card_name', 'amount', 'paid_at', 'notes', 'created_at']
const SETTINGS_HEADERS = ['default_offer_rate', 'default_tithe_rate', 'updated_at']

module.exports = { SHEET_SCHEMA_VERSION, SPREADSHEET_NAME, AUXILIARY_SHEETS, TRANSACTION_HEADERS, CATEGORY_HEADERS, CARD_HEADERS, RECURRING_HEADERS, PAYMENT_HEADERS, SETTINGS_HEADERS }
