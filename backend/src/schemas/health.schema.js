const { z } = require('zod')

// `?verbose=true` inclui informação extra (não usado ainda em getHealth, mas
// já validado end-to-end para provar que rota → schema → middleware →
// controller estão de fato conectados).
const healthQuerySchema = z.object({
  verbose: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
})

module.exports = { healthQuerySchema }
