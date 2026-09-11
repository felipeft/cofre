const app = require('./app')
const config = require('./config')
const logger = require('./utils/logger')
const { ensureDatabaseReady } = require('./database/bootstrap')
const { closeDatabase } = require('./database/connection')

async function start() {
  // Garante banco criado + migrations em dia antes de aceitar qualquer
  // requisição. Em uma máquina nova, `npm run dev` sozinho já deixa tudo
  // pronto — sem passo manual.
  await ensureDatabaseReady()

  const server = app.listen(config.port, () => {
    logger.info('Servidor iniciado', {
      port: config.port,
      environment: config.env,
      allowedOrigins: config.cors.allowedOrigins,
    })
  })

  function shutdown(signal) {
    logger.info('Encerrando servidor', { signal })
    server.close(async () => {
      await closeDatabase()
      process.exit(0)
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start().catch((error) => {
  logger.error('Falha ao iniciar o servidor', { error: error.message })
  process.exit(1)
})
