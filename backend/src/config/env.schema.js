const { z } = require('zod')

// Valida as variáveis de ambiente uma única vez, na inicialização. Se algo
// estiver faltando ou no formato errado, o servidor falha imediatamente com
// uma mensagem clara — em vez de quebrar de forma obscura no meio de uma
// requisição, minutos ou dias depois.
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Lista separada por vírgulas (ex: "http://localhost:5173,https://cofre-orcin.vercel.app").
  // Normalizada aqui para um array de URLs já validadas — o resto do app
  // (config/index.js, cors.middleware.js) nunca lida com a string crua.
  FRONTEND_URLS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean)
    )
    .pipe(z.array(z.string().url()).min(1, 'Informe ao menos uma origin em FRONTEND_URLS.')),

  DATABASE_PATH: z.string().min(1).default('./src/database/cofre.db'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Ainda não usadas nesta etapa (sem autenticação/integração ainda), mas já
  // validadas quando presentes para que a etapa de OAuth não precise mexer
  // aqui — só preencher o .env de verdade.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SESSION_SECRET: z.string().optional(),
  GOOGLE_SHEETS_ID: z.string().optional(),
})

function parseEnv(source = process.env) {
  const result = envSchema.safeParse(source)

  if (!result.success) {
    console.error('[config] Variáveis de ambiente inválidas:')
    console.error(result.error.flatten().fieldErrors)
    process.exit(1)
  }

  return result.data
}

module.exports = { envSchema, parseEnv }
