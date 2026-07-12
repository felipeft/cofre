const packageJson = require('../../package.json')

// Fonte única de metadados da aplicação. As rotas de sistema (/, /version)
// leem daqui em vez de hardcodar string solta em cada controller.
module.exports = Object.freeze({
  NAME: 'Cofre API',
  DESCRIPTION: 'API do sistema de gestão financeira pessoal Cofre.',
  VERSION: packageJson.version,
})
