// Códigos de erro estáveis para o campo `code` da resposta padronizada.
// O frontend (ou qualquer outro cliente) pode confiar nesses valores sem
// precisar interpretar a mensagem em português.
module.exports = Object.freeze({
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DATABASE_ERROR: 'DATABASE_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
})
