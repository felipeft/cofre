const { z } = require('zod')
const crypto = require('crypto')
const { TRANSACTION_HEADERS, VISIBLE_TRANSACTION_COLUMN_COUNT } = require('../../constants/googleSheets')

const TYPE_TO_SHEET = { income: 'Receita', expense: 'Despesa' }
const TYPE_FROM_SHEET = { receita: 'income', despesa: 'expense', income: 'income', expense: 'expense' }
const STATUS_TO_SHEET = { confirmed: 'Confirmada', pending: 'Pendente', cancelled: 'Cancelada' }
const STATUS_FROM_SHEET = { confirmada: 'confirmed', confirmado: 'confirmed', confirmed: 'confirmed', pendente: 'pending', pending: 'pending', cancelada: 'cancelled', cancelado: 'cancelled', cancelled: 'cancelled' }

function blank(value) { return value == null ? '' : value }
function normalized(value) { return String(value || '').trim().toLocaleLowerCase('pt-BR') }
function nullable(value, parser = String) { return value === '' || value == null ? null : parser(value) }
function boolean(value) { return value === true || value === 1 || ['true', 'sim', 'yes'].includes(normalized(value)) }

function parseDate(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(value) * 86400000).toISOString().slice(0, 10)
  }
  const text = String(value || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text)
  return match ? `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}` : text
}
function displayDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''))
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value
}
function visibleHash(values) { return crypto.createHash('sha256').update(JSON.stringify(values)).digest('hex') }

function transactionToSheetRow(row) {
  const tags = (() => { try { return JSON.parse(row.tags || '[]') } catch { return [] } })()
  const visible = [
    row.id, displayDate(row.date), TYPE_TO_SHEET[row.type] || row.type, row.description, row.category_name,
    row.amount, row.card_id ? 'Cartão' : 'Dinheiro', blank(row.card_name),
    row.installment_current ? `${row.installment_current}/${row.installment_total}` : '',
    row.is_recurring ? 'Sim' : 'Não', STATUS_TO_SHEET[row.status] || row.status,
    tags.join(', '), row.notes || '',
  ]
  return [...visible,
    row.competence_year, row.competence_month, row.category_id, blank(row.card_id),
    blank(row.installment_current), blank(row.installment_total), blank(row.installment_group_id),
    blank(row.recurring_expense_id), row.source, Boolean(row.is_fixed), row.created_at,
    JSON.stringify(tags), visibleHash(visible),
  ]
}

function rowObject(headers, row) { return Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])) }
const nullableId = z.union([z.number().int().positive(), z.null()])
const importSchema = z.object({
  transactionId: nullableId, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  competenceYear: z.number().int().min(1900).max(9999), competenceMonth: z.number().int().min(1).max(12),
  type: z.enum(['income', 'expense']), description: z.string().trim().min(1).max(200),
  categoryId: nullableId, categoryName: z.string().trim().min(1).max(120), amount: z.number().positive(),
  paymentMethod: z.enum(['cash', 'card']), cardId: nullableId, cardName: z.string().trim().max(120).nullable(),
  installmentLabel: z.string().max(40), installmentCurrent: nullableId,
  installmentTotal: nullableId, installmentGroupId: z.string().max(200).nullable(), recurringExpenseId: nullableId,
  status: z.enum(['pending', 'confirmed', 'cancelled']),
  source: z.string().min(1).max(80), isRecurring: z.boolean(), isFixed: z.boolean(),
  tags: z.array(z.string().max(100)).max(50), displayTags: z.string().max(2000), notes: z.string().max(2000),
  exportHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(), sheetModified: z.boolean(),
})

function sheetRowToImportCandidate(headers, row, rowNumber, sheetYear, schemaVersion = 3) {
  const requiredHeaders = TRANSACTION_HEADERS.slice(0, VISIBLE_TRANSACTION_COLUMN_COUNT)
  const missing = requiredHeaders.filter((header) => !headers.includes(header))
  if (missing.length) return { success: false, rowNumber, errors: [`Cabeçalhos ausentes: ${missing.join(', ')}`] }
  const value = rowObject(headers, row)
  // Layouts v2 ainda são aceitos durante a primeira sincronização após a
  // atualização. Usar as 15 colunas antigas mantém a detecção de edição
  // intacta; a exportação seguinte reescreve a planilha no layout v3.
  const visibleHeaders = schemaVersion === 2 ? headers.slice(0, 15) : requiredHeaders
  const currentVisibleHash = visibleHash(visibleHeaders.map((header) => value[header]))
  const date = parseDate(value.Data)
  const dateParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  let tags
  try { tags = value._tags_json ? JSON.parse(value._tags_json) : String(value.Tags || '').split(',').map((tag) => tag.trim()).filter(Boolean) } catch { return { success: false, rowNumber, errors: ['Tags inválidas.'] } }
  const transactionId = nullable(value.ID, Number)
  const type = TYPE_FROM_SHEET[normalized(value.Tipo)] || (transactionId ? null : 'expense')
  const paymentCard = ['cartão', 'cartao'].includes(normalized(value.Pagamento))
  const parsed = importSchema.safeParse({
    transactionId, date, competenceYear: Number(value._competence_year || dateParts?.[1] || sheetYear),
    competenceMonth: Number(value._competence_month || dateParts?.[2]), type,
    description: String(value['Descrição'] || ''), categoryId: nullable(value._category_id, Number),
    categoryName: String(value.Categoria || ''), amount: Number(value.Valor), paymentMethod: paymentCard ? 'card' : 'cash', cardId: nullable(value._card_id, Number),
    cardName: paymentCard ? nullable(value['Cartão']) : null,
    installmentLabel: String(value.Parcela || ''), installmentCurrent: nullable(value._installment_current, Number), installmentTotal: nullable(value._installment_total, Number),
    installmentGroupId: nullable(value._installment_group_id), recurringExpenseId: nullable(value._recurring_expense_id, Number),
    status: STATUS_FROM_SHEET[normalized(value.Status)] || (transactionId ? null : 'confirmed'),
    source: String(value._source || 'sheets_import'), isRecurring: boolean(value.Recorrente), isFixed: boolean(value._is_fixed),
    tags, displayTags: String(value.Tags || ''), notes: String(value['Observações'] || ''),
    exportHash: nullable(value._export_hash), sheetModified: Boolean(value._export_hash) && value._export_hash !== currentVisibleHash,
  })
  if (!parsed.success) return { success: false, rowNumber, errors: parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`) }
  if (!transactionId && parsed.data.type !== 'expense') return { success: false, rowNumber, errors: ['Novos lançamentos pela planilha devem ser despesas.'] }
  if (!transactionId && Number(dateParts?.[1]) !== Number(sheetYear)) return { success: false, rowNumber, errors: [`A data deve pertencer ao ano da aba ${sheetYear}.`] }
  if (!transactionId && paymentCard && !parsed.data.cardName) return { success: false, rowNumber, errors: ['Selecione um cartão para este pagamento.'] }
  if (!transactionId && (parsed.data.isRecurring || parsed.data.installmentCurrent || parsed.data.recurringExpenseId)) return { success: false, rowNumber, errors: ['Recorrências e parcelamentos devem ser cadastrados no Cofre.'] }
  return { success: true, rowNumber, data: parsed.data }
}

module.exports = { transactionToSheetRow, sheetRowToImportCandidate, parseDate }
