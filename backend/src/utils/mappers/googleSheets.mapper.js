const { z } = require('zod')
const { TRANSACTION_HEADERS } = require('../../constants/googleSheets')

function blank(value) { return value == null ? '' : value }

function transactionToSheetRow(row) {
  return [
    row.id, row.date, row.competence_year, row.competence_month, row.type, row.description,
    row.category_id, row.category_name, row.amount, row.card_id ? 'credit_card' : 'cash', blank(row.card_id), blank(row.card_name),
    blank(row.installment_current), blank(row.installment_total), blank(row.installment_group_id), blank(row.recurring_expense_id),
    row.offer_amount, row.tithe_amount, blank(row.offer_rate_applied), blank(row.tithe_rate_applied), row.status,
    row.source, Boolean(row.is_recurring), Boolean(row.is_fixed), row.tags || '[]', row.notes || '', row.created_at, row.updated_at,
  ]
}

function rowObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? '']))
}

const nullableId = z.union([z.number().int().positive(), z.null()])
const importSchema = z.object({
  transactionId: nullableId,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  competenceYear: z.number().int().min(1900).max(9999),
  competenceMonth: z.number().int().min(1).max(12),
  type: z.enum(['income', 'expense']),
  description: z.string().max(200),
  categoryId: z.number().int().positive(),
  amount: z.number().positive(),
  cardId: nullableId,
  installmentCurrent: nullableId,
  installmentTotal: nullableId,
  installmentGroupId: z.string().max(200).nullable(),
  recurringExpenseId: nullableId,
  offerAmount: z.number().min(0),
  titheAmount: z.number().min(0),
  offerRateApplied: z.number().min(0).max(1).nullable(),
  titheRateApplied: z.number().min(0).max(1).nullable(),
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  source: z.string().min(1).max(80),
  isRecurring: z.boolean(),
  isFixed: z.boolean(),
  tags: z.array(z.string().max(100)).max(50),
  notes: z.string().max(2000),
})

function nullable(value, parser = String) { return value === '' || value == null ? null : parser(value) }
function boolean(value) { return value === true || value === 1 || String(value).toLowerCase() === 'true' }

function sheetRowToImportCandidate(headers, row, rowNumber) {
  const missing = TRANSACTION_HEADERS.filter((header) => !headers.includes(header))
  if (missing.length) return { success: false, rowNumber, errors: [`Cabeçalhos ausentes: ${missing.join(', ')}`] }
  const value = rowObject(headers, row)
  let tags
  try { tags = JSON.parse(value.tags_json || '[]') } catch { return { success: false, rowNumber, errors: ['tags_json inválido.'] } }
  const parsed = importSchema.safeParse({
    transactionId: nullable(value.transaction_id, Number),
    date: String(value.date || ''),
    competenceYear: Number(value.competence_year),
    competenceMonth: Number(value.competence_month),
    type: value.type,
    description: String(value.description || ''),
    categoryId: Number(value.category_id),
    amount: Number(value.amount),
    cardId: nullable(value.card_id, Number),
    installmentCurrent: nullable(value.installment_current, Number),
    installmentTotal: nullable(value.installment_total, Number),
    installmentGroupId: nullable(value.installment_group_id),
    recurringExpenseId: nullable(value.recurring_expense_id, Number),
    offerAmount: Number(value.offer_amount || 0),
    titheAmount: Number(value.tithe_amount || 0),
    offerRateApplied: nullable(value.offer_rate_applied, Number),
    titheRateApplied: nullable(value.tithe_rate_applied, Number),
    status: value.status,
    source: String(value.source || 'sheets_import'),
    isRecurring: boolean(value.is_recurring),
    isFixed: boolean(value.is_fixed),
    tags,
    notes: String(value.notes || ''),
  })
  return parsed.success
    ? { success: true, rowNumber, data: parsed.data }
    : { success: false, rowNumber, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }
}

module.exports = { transactionToSheetRow, sheetRowToImportCandidate }
