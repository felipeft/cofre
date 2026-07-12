# Logs

`src/utils/logger.js` escreve no console em formato JSON estruturado
(`timestamp`, `level`, `message`, `requestId`...). Esta pasta é o destino
planejado para quando os logs passarem a ser persistidos em arquivo — por
exemplo, com rotação diária (`cofre-2026-07-12.log`).

Nada aqui é lido ou escrito ainda nesta etapa. Quando essa persistência for
implementada, a mudança fica isolada em `logger.js` (trocar `console.log`
por um `fs.appendFile`/biblioteca de log): nenhum outro arquivo do backend
chama `console` diretamente, todos usam `logger`.
