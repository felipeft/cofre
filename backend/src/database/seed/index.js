const logger = require('../../utils/logger')

// Cada seed futuro será uma função registrada aqui, ex:
//   const seedCategories = require('./categories.seed')
//   const SEEDS = [seedCategories]
// e rodada em ordem dentro de uma transação, do mesmo jeito que as
// migrations. Nenhum seed existe ainda porque esta etapa não cria dados de
// negócio — só a estrutura para quando eles existirem.
const SEEDS = []

function runSeed() {
  if (SEEDS.length === 0) {
    logger.info('Nenhum seed registrado ainda.')
    return
  }

  for (const seed of SEEDS) {
    seed()
  }
}

module.exports = { runSeed }

// Permite `node src/database/seed/index.js` (script `npm run seed`).
if (require.main === module) {
  runSeed()
  process.exit(0)
}
