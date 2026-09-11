const path = require('path')
const dotenv = require('dotenv')
const { parseEnv } = require('./env.schema')

dotenv.config()

const env = parseEnv(process.env)

// Único lugar que o resto do backend consulta para saber "em que ambiente
// estou, em que porta, onde fica o banco". Nenhum outro arquivo deve ler
// `process.env` diretamente — isso mantém a validação (env.schema.js) como
// a única porta de entrada e evita `process.env.PORT` espalhado pelo código.
const config = Object.freeze({
  env: env.NODE_ENV,
  isProduction: env.NODE_ENV === 'production',
  isDevelopment: env.NODE_ENV === 'development',

  port: env.PORT,
  logLevel: env.LOG_LEVEL,

  // Mesmo padrão de config.database/config.googleAuth/etc: um sub-objeto
  // dedicado, já pronto para uso — o middleware de CORS só lê
  // `config.cors.allowedOrigins`, nunca `process.env` ou uma URL fixa.
  cors: Object.freeze({
    allowedOrigins: env.FRONTEND_URLS,
  }),

  database: Object.freeze({
    path: path.resolve(process.cwd(), env.DATABASE_PATH),
    tursoUrl: env.TURSO_DATABASE_URL ?? null,
    tursoAuthToken: env.TURSO_AUTH_TOKEN ?? null,
  }),

  // Timeouts e limites gerais da aplicação. Centralizados aqui para que
  // ajustá-los não exija procurar "magic numbers" pelo código.
  http: Object.freeze({
    requestTimeoutMs: 30_000,
    jsonBodyLimit: '1mb',
  }),

  // Configuração do fluxo OAuth mantida exclusivamente no backend.
  googleAuth: Object.freeze({
    clientId: env.GOOGLE_CLIENT_ID ?? null,
    clientSecret: env.GOOGLE_CLIENT_SECRET ?? null,
    callbackUrl: env.GOOGLE_CALLBACK_URL ?? null,
    allowedEmails: Object.freeze(env.AUTH_ALLOWED_EMAILS),
    legacyOwnerEmail: env.AUTH_LEGACY_OWNER_EMAIL ?? null,
  }),

  session: Object.freeze({
    secret: env.SESSION_SECRET ?? null,
    ttlDays: env.SESSION_TTL_DAYS,
    cookieName: env.SESSION_COOKIE_NAME,
  }),

  // Preenchido quando a integração com Google Sheets for implementada.
  googleSheets: Object.freeze({
    spreadsheetId: env.GOOGLE_SHEETS_ID ?? null,
  }),
})

module.exports = config
