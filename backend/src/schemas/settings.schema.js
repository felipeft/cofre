const { z } = require('zod')

const RATE_MESSAGE = 'deve ser um número entre 0 e 1 (ex: 0.01 para 1%).'

const updateSettingsSchema = z
  .strictObject({
    defaultOfferRate: z.number().min(0, RATE_MESSAGE).max(1, RATE_MESSAGE).optional(),
    defaultTitheRate: z.number().min(0, RATE_MESSAGE).max(1, RATE_MESSAGE).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'Envie ao menos uma preferência para atualizar.' })

module.exports = { updateSettingsSchema }
