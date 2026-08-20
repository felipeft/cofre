const { z } = require('zod')

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const RATE_MESSAGE = 'deve ser um número entre 0 e 1 (ex: 0.01 para 1%).'

const categoryTypeSchema = z.enum(['income', 'expense'], {
  errorMap: () => ({ message: "type deve ser 'income' ou 'expense'." }),
})

// Validadores "puros" (sem .default()), compartilhados entre criação e
// atualização. Um `.default()` sobrevive a `.partial()` — se ele morasse
// aqui, um PUT com corpo vazio "preencheria" isActive/sortOrder com o
// default e passaria despercebido pelo `.refine` que rejeita corpo vazio,
// além de sobrescrever esses campos sem o cliente ter pedido. Por isso
// `.default()` só é aplicado no schema de criação, nunca no de atualização.
const core = {
  name: z.string().trim().min(1, 'name é obrigatório.').max(60),
  type: categoryTypeSchema,
  color: z.string().regex(HEX_COLOR_REGEX, 'color deve ser um hex válido (#3ecf8e).'),
  icon: z.string().trim().min(1, 'icon é obrigatório.').max(60),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0),
  // Regras financeiras da fonte de renda (ver domain/financialRules.js).
  // `null` explícito em offerRate/titheRate significa "use a taxa padrão
  // global" — por isso `.nullable()`, não apenas `.optional()`.
  applyOffer: z.boolean(),
  offerRate: z.coerce.number().min(0, RATE_MESSAGE).max(1, RATE_MESSAGE).nullable(),
  applyTithe: z.boolean(),
  titheRate: z.coerce.number().min(0, RATE_MESSAGE).max(1, RATE_MESSAGE).nullable(),
}

const createCategorySchema = z.object({
  name: core.name,
  type: core.type,
  color: core.color,
  icon: core.icon,
  isActive: core.isActive.optional().default(true),
  sortOrder: core.sortOrder.optional().default(0),
  applyOffer: core.applyOffer.optional().default(false),
  offerRate: core.offerRate.optional().default(null),
  applyTithe: core.applyTithe.optional().default(false),
  titheRate: core.titheRate.optional().default(null),
})

const updateCategorySchema = z
  .object({
    name: core.name.optional(),
    type: core.type.optional(),
    color: core.color.optional(),
    icon: core.icon.optional(),
    isActive: core.isActive.optional(),
    sortOrder: core.sortOrder.optional(),
    applyOffer: core.applyOffer.optional(),
    offerRate: core.offerRate.optional(),
    applyTithe: core.applyTithe.optional(),
    titheRate: core.titheRate.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Envie ao menos um campo para atualizar.',
  })

const categoryIdParamSchema = z.object({
  id: z.coerce.number().int().positive('id inválido.'),
})

const listCategoriesQuerySchema = z.object({
  type: categoryTypeSchema.optional(),
  includeInactive: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((value) => value === 'true'),
})

module.exports = {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema,
  listCategoriesQuerySchema,
}
