const { z } = require('zod')

const createSpreadsheetSchema = z.strictObject({
  startYear: z.number().int().min(1900).max(new Date().getUTCFullYear()),
})

const confirmImportSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
})

const synchronizeSchema = z.strictObject({
  requestId: z.string().uuid(),
})

const syncHistoryQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

module.exports = { createSpreadsheetSchema, confirmImportSchema, synchronizeSchema, syncHistoryQuerySchema }
