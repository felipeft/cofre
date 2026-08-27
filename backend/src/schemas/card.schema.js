const { z } = require('zod')

// Validadores "puros" (sem .default()), compartilhados entre criação e
// atualização — mesmo raciocínio de category.schema.js e
// transaction.schema.js: `.default()` sobrevive a campos opcionais e faria
// um PUT parcial reescrever campos que o cliente nunca tocou.
const core = {
  name: z.string().trim().min(1, 'name é obrigatório.').max(60),
  creditLimit: z.coerce.number().positive('creditLimit deve ser maior que zero.'),
  closingDay: z.coerce.number().int().min(1).max(31),
  dueDay: z.coerce.number().int().min(1).max(31),
  isActive: z.boolean(),
}

const createCardSchema = z.object({
  name: core.name,
  creditLimit: core.creditLimit,
  closingDay: core.closingDay,
  dueDay: core.dueDay,
  isActive: core.isActive.optional().default(true),
})

const updateCardSchema = z
  .object({
    name: core.name.optional(),
    creditLimit: core.creditLimit.optional(),
    closingDay: core.closingDay.optional(),
    dueDay: core.dueDay.optional(),
    isActive: core.isActive.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envie ao menos um campo para atualizar.',
  })

const cardIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id inválido.'),
})

const listCardsQuerySchema = z.object({
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
})

module.exports = { createCardSchema, updateCardSchema, cardIdParamSchema, listCardsQuerySchema }
