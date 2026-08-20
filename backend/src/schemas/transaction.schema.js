const { z } = require('zod')
const { paginationSchema } = require('./pagination.schema')

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const dateField = (message) => z.string().regex(DATE_REGEX, message)

const transactionTypeSchema = z.enum(['income', 'expense'], {
  errorMap: () => ({ message: "type deve ser 'income' ou 'expense'." }),
})

const transactionStatusSchema = z.enum(['pending', 'confirmed', 'cancelled'])

// Validadores "puros" (sem .default()), compartilhados entre criação e
// atualização — mesmo raciocínio do category.schema.js: `.default()`
// sobrevive a campos opcionais e faria um PUT parcial reescrever campos que
// o cliente nunca tocou (e ainda escaparia do `.refine` de "corpo vazio").
const core = {
  description: z.string().trim().max(255),
  amount: z.coerce.number().positive('amount deve ser maior que zero.'),
  type: transactionTypeSchema,
  categoryId: z.coerce.number().int().positive('categoryId inválido.'),
  date: dateField('date deve estar no formato YYYY-MM-DD.'),
  competenceMonth: z.coerce.number().int().min(1).max(12),
  competenceYear: z.coerce.number().int().min(2000).max(2100),
  notes: z.string().trim().max(1000),
  source: z.string().trim().max(60),
  isRecurring: z.boolean(),
  isFixed: z.boolean(),
  card: z.string().trim().max(60).nullable(),
  installmentCurrent: z.coerce.number().int().positive(),
  installmentTotal: z.coerce.number().int().positive(),
  tags: z.array(z.string().trim().min(1)),
  status: transactionStatusSchema,
}

// Parcela atual nunca pode ser maior que o total de parcelas — validado nos
// dois schemas (create exige ambos ou nenhum; update só checa quando ambos
// aparecem juntos no mesmo PUT).
function refineInstallments(data, ctx) {
  const { installmentCurrent, installmentTotal } = data
  const hasCurrent = installmentCurrent !== undefined
  const hasTotal = installmentTotal !== undefined

  if (hasCurrent !== hasTotal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Informe installmentCurrent e installmentTotal juntos, ou nenhum dos dois.',
      path: ['installmentTotal'],
    })
    return
  }

  if (hasCurrent && hasTotal && installmentCurrent > installmentTotal) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'installmentCurrent não pode ser maior que installmentTotal.',
      path: ['installmentCurrent'],
    })
  }
}

const createTransactionSchema = z
  .object({
    description: core.description.optional().default(''),
    amount: core.amount,
    type: core.type,
    categoryId: core.categoryId,
    date: core.date,
    competenceMonth: core.competenceMonth.optional(),
    competenceYear: core.competenceYear.optional(),
    notes: core.notes.optional().default(''),
    source: core.source.optional().default('manual'),
    isRecurring: core.isRecurring.optional().default(false),
    isFixed: core.isFixed.optional().default(false),
    card: core.card.optional(),
    installmentCurrent: core.installmentCurrent.optional(),
    installmentTotal: core.installmentTotal.optional(),
    tags: core.tags.optional().default([]),
    status: core.status.optional().default('confirmed'),
  })
  .superRefine(refineInstallments)

const updateTransactionSchema = z
  .object({
    description: core.description.optional(),
    amount: core.amount.optional(),
    type: core.type.optional(),
    categoryId: core.categoryId.optional(),
    date: core.date.optional(),
    competenceMonth: core.competenceMonth.optional(),
    competenceYear: core.competenceYear.optional(),
    notes: core.notes.optional(),
    source: core.source.optional(),
    isRecurring: core.isRecurring.optional(),
    isFixed: core.isFixed.optional(),
    card: core.card.optional(),
    installmentCurrent: core.installmentCurrent.optional(),
    installmentTotal: core.installmentTotal.optional(),
    tags: core.tags.optional(),
    status: core.status.optional(),
  })
  .superRefine(refineInstallments)
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envie ao menos um campo para atualizar.',
  })

const transactionIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id inválido.'),
})

const SORT_FIELDS = ['date', 'amount', 'description', 'category', 'createdAt']

const listTransactionsQuerySchema = paginationSchema.extend({
  q: z.string().trim().min(1).optional(),
  type: transactionTypeSchema.optional(),
  categoryId: z.coerce.number().int().positive().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  dateFrom: dateField('dateFrom deve estar no formato YYYY-MM-DD.').optional(),
  dateTo: dateField('dateTo deve estar no formato YYYY-MM-DD.').optional(),
  status: transactionStatusSchema.optional(),
  sortBy: z.enum(SORT_FIELDS).optional().default('date'),
  sortDir: z.enum(['asc', 'desc']).optional().default('desc'),
})

// GET /transactions/summary — competência obrigatória: um resumo financeiro
// "de todos os tempos" misturaria anos e não corresponde a nenhuma pergunta
// real que o domínio precisa responder nesta etapa.
const financialSummaryQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
})

module.exports = {
  createTransactionSchema,
  updateTransactionSchema,
  transactionIdParamSchema,
  listTransactionsQuerySchema,
  financialSummaryQuerySchema,
}
