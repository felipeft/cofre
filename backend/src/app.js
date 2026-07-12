const express = require('express')
const config = require('./config')
const corsMiddleware = require('./middlewares/cors.middleware')
const requestId = require('./middlewares/requestId.middleware')
const requestLogger = require('./middlewares/requestLogger.middleware')
const notFoundHandler = require('./middlewares/notFound.middleware')
const errorHandler = require('./middlewares/errorHandler.middleware')
const routes = require('./routes')

// Separado de server.js de propósito: `app` é só a definição do Express
// (middlewares + rotas), sem efeito colateral de rede. Isso permite testar a
// aplicação inteira (supertest, por exemplo) sem precisar abrir uma porta de
// verdade — só importar este arquivo.
const app = express()

app.use(requestId)
app.use(corsMiddleware)
app.use(express.json({ limit: config.http.jsonBodyLimit }))
app.use(requestLogger)

// Pontos reservados para quando as próximas etapas chegarem:
//   app.use(helmet())              — cabeçalhos de segurança
//   app.use(rateLimit(...))        — rate limiting
//   app.use(session({ secret: config.session.secret, cookie: { httpOnly: true } })) — sessão do usuário
//   app.use(csrfProtection)        — proteção CSRF nas rotas que alteram estado

app.use(routes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
