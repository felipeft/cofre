const { z } = require('zod')

// Nenhum endpoint desta etapa lista nada, mas praticamente todo endpoint de
// listagem futuro (GET /transactions, GET /categories) vai precisar disso —
// fica pronto aqui em vez de ser reinventado em cada schema depois.
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

module.exports = { paginationSchema }
