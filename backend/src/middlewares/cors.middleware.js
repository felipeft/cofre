const cors = require('cors')
const config = require('../config')

// Só o frontend configurado em FRONTEND_URL pode chamar a API. Centralizado
// aqui (em vez de `cors()` liberado geral) porque este backend vai lidar
// com cookies de sessão HTTP-only na etapa de autenticação, e cookies cross-
// origin exigem uma origin explícita — `credentials: true` já deixa isso
// pronto.
const corsMiddleware = cors({
  origin: config.frontendUrl,
  credentials: true,
})

module.exports = corsMiddleware
