// Logger simples baseado em console, mas com formato estruturado (nível,
// timestamp, requestId opcional) para que trocar por um transport de
// arquivo/serviço externo no futuro (ex: Winston, Pino) seja só uma questão
// de trocar a função `write` abaixo — nenhum outro arquivo do projeto
// precisaria mudar, porque todos importam `logger`, nunca `console`
// diretamente.
//
// A pasta `src/logs/` já existe para quando a persistência em arquivo for
// implementada (ver `src/logs/README.md`).

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info

function write(level, message, meta = {}) {
  if (LEVELS[level] < currentLevel) return

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta,
  }

  const line = JSON.stringify(entry)
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
}

module.exports = logger
