const { z } = require('zod')
const logger = require('../utils/logger')

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
  // Cada origin também tem barra(s) final(is) removida(s): o header
  // `Origin` enviado pelo navegador nunca tem barra no final, então uma
  // entrada configurada como ".../app/" nunca bateria no `===` exato do
  // middleware — silenciosamente, sem nenhum erro visível.
  FRONTEND_URLS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)
    )
    .pipe(z.array(z.string().url()).min(1, 'Informe ao menos uma origin em FRONTEND_URLS.')),

  DATABASE_PATH: z.string().min(1).default('./src/database/cofre.db'),
  TURSO_DATABASE_URL: z.string().url().optional(),
  TURSO_AUTH_TOKEN: z.string().min(1).optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Ainda não usadas nesta etapa (sem autenticação/integração ainda), mas já
  // validadas quando presentes para que a etapa de OAuth não precise mexer
  // aqui — só preencher o .env de verdade.
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),
  GOOGLE_CALLBACK_URL: z.string().url().optional(),
  AUTH_ALLOWED_EMAILS: z
    .string()
    .default('')
    .transform((value) => value.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)),
  AUTH_LEGACY_OWNER_EMAIL: z.string().email().transform((value) => value.trim().toLowerCase()).optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(90),
  SESSION_COOKIE_NAME: z.string().min(1).default('cofre_session'),
  GOOGLE_SHEETS_ID: z.string().optional(),
}).superRefine((env, ctx) => {
  if (Boolean(env.TURSO_DATABASE_URL) !== Boolean(env.TURSO_AUTH_TOKEN)) {
    ctx.addIssue({ code: 'custom', path: ['TURSO_DATABASE_URL'], message: 'TURSO_DATABASE_URL e TURSO_AUTH_TOKEN devem ser configurados juntos.' })
  }
  if (env.NODE_ENV !== 'production') return
  for (const field of ['TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN']) {
    if (!env[field]) ctx.addIssue({ code: 'custom', path: [field], message: `${field} é obrigatório em produção.` })
  }
  for (const field of ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_CALLBACK_URL', 'SESSION_SECRET']) {
    if (!env[field]) ctx.addIssue({ code: 'custom', path: [field], message: `${field} é obrigatório em produção.` })
  }
  if (env.AUTH_ALLOWED_EMAILS.length === 0) ctx.addIssue({ code: 'custom', path: ['AUTH_ALLOWED_EMAILS'], message: 'Informe ao menos um e-mail autorizado em produção.' })
  if (env.AUTH_LEGACY_OWNER_EMAIL && !env.AUTH_ALLOWED_EMAILS.includes(env.AUTH_LEGACY_OWNER_EMAIL)) {
    ctx.addIssue({ code: 'custom', path: ['AUTH_LEGACY_OWNER_EMAIL'], message: 'O proprietário legado também precisa estar na whitelist.' })
  }
})

function parseEnv(source = process.env) {
  // FRONTEND_URLS (plural) é o nome canônico, documentado em .env.example,
  // e o único que o resto do app conhece (config.cors.allowedOrigins). Mas
  // um ambiente já configurado com o nome singular `FRONTEND_URL` (erro
  // fácil de cometer, e o que de fato aconteceu no Render) não pode
  // simplesmente cair no default de localhost em silêncio — isso é
  // exatamente o tipo de falha que derruba o CORS em produção sem nenhum
  // erro óbvio no log de start. Normaliza aqui, antes da validação, e avisa.
  const normalizedSource = { ...source }
  if (!normalizedSource.FRONTEND_URLS && normalizedSource.FRONTEND_URL) {
    normalizedSource.FRONTEND_URLS = normalizedSource.FRONTEND_URL
    logger.warn(
      "Usando FRONTEND_URL (singular) como fallback para FRONTEND_URLS. Renomeie a variável de ambiente para FRONTEND_URLS — o nome singular pode deixar de ser aceito no futuro."
    )
  }

  const result = envSchema.safeParse(normalizedSource)

  if (!result.success) {
    // Único ponto do bootstrap onde o app pode falhar antes mesmo de existir
    // um `config` válido — por isso valida direto contra `process.env`, mas
    // ainda assim usa `logger` (que só depende de `process.env.LOG_LEVEL`,
    // não de `config`) em vez de `console` cru, para manter a mesma
    // convenção do resto do projeto.
    logger.error('Variáveis de ambiente inválidas', { fieldErrors: result.error.flatten().fieldErrors })
    process.exit(1)
  }

  return result.data
}

module.exports = { envSchema, parseEnv }
