const { z } = require('zod')

const updateSettingsSchema = z
  .strictObject({
    theme: z.enum(['system', 'light', 'dark']).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Envie ao menos uma preferência para atualizar.' })

module.exports = { updateSettingsSchema }
