const { z } = require('zod')

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

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
}

const createCategorySchema = z.object({
  name: core.name,
  type: core.type,
  color: core.color,
  icon: core.icon,
  isActive: core.isActive.optional().default(true),
  sortOrder: core.sortOrder.optional().default(0),
})

const updateCategorySchema = z
  .object({
    name: core.name.optional(),
    type: core.type.optional(),
    color: core.color.optional(),
    icon: core.icon.optional(),
    isActive: core.isActive.optional(),
    sortOrder: core.sortOrder.optional(),
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
