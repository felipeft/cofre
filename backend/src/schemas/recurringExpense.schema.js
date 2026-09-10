const { z } = require('zod')

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/
const date = z.string().regex(DATE_REGEX, 'deve estar no formato YYYY-MM-DD.')
const core = {
  description: z.string().trim().min(1, 'description é obrigatório.').max(255),
  amount: z.coerce.number().positive('amount deve ser maior que zero.'),
  categoryId: z.coerce.number().int().positive('categoryId inválido.'),
  dayOfMonth: z.coerce.number().int().min(1).max(31),
  startDate: date,
  endDate: date.nullable(),
  isActive: z.boolean(),
  cardId: z.coerce.number().int().positive('cardId inválido.').nullable(),
  notes: z.string().trim().max(1000),
  source: z.string().trim().max(60),
}
function dateOrder(data, ctx) {
  if (data.startDate && data.endDate && data.endDate < data.startDate) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['endDate'], message: 'endDate deve ser igual ou posterior a startDate.' })
}
const createRecurringExpenseSchema = z.object({ description: core.description, amount: core.amount, categoryId: core.categoryId, dayOfMonth: core.dayOfMonth, startDate: core.startDate, endDate: core.endDate.optional().default(null), isActive: core.isActive.optional().default(true), cardId: core.cardId.optional().default(null), notes: core.notes.optional().default(''), source: core.source.optional().default('recurring') }).superRefine(dateOrder)
const updateRecurringExpenseSchema = z.object({ description: core.description.optional(), amount: core.amount.optional(), categoryId: core.categoryId.optional(), dayOfMonth: core.dayOfMonth.optional(), startDate: core.startDate.optional(), endDate: core.endDate.optional(), isActive: core.isActive.optional(), cardId: core.cardId.optional(), notes: core.notes.optional(), source: core.source.optional() }).superRefine(dateOrder).refine((data) => Object.keys(data).length > 0, { message: 'Envie ao menos um campo para atualizar.' })
const recurringExpenseIdParamSchema = z.object({ id: z.coerce.number().int().positive('id inválido.') })
const listRecurringExpensesQuerySchema = z.object({ includeInactive: z.enum(['true', 'false']).optional().default('false').transform((value) => value === 'true') })
module.exports = { createRecurringExpenseSchema, updateRecurringExpenseSchema, recurringExpenseIdParamSchema, listRecurringExpensesQuerySchema }
