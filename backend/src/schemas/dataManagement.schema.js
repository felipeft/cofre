const { z } = require('zod')

const previewQuerySchema = z.strictObject({
  operation: z.enum(['clear-records', 'reset']),
})

const clearRecordsSchema = z.strictObject({
  confirmation: z.literal('LIMPAR REGISTROS'),
})

const resetSchema = z.strictObject({
  confirmation: z.literal('RESETAR COFRE'),
})

module.exports = { previewQuerySchema, clearRecordsSchema, resetSchema }
