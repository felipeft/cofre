const { z } = require('zod')

const updateProfileSchema = z
  .strictObject({
    displayName: z.string().trim().min(1, 'displayName não pode ficar vazio.').max(80).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Envie ao menos um campo para atualizar.' })

module.exports = { updateProfileSchema }
