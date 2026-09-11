const { z } = require('zod')

const createSpreadsheetSchema = z.strictObject({
  startYear: z.number().int().min(1900).max(new Date().getUTCFullYear()),
})

const confirmImportSchema = z.strictObject({
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
})

module.exports = { createSpreadsheetSchema, confirmImportSchema }
