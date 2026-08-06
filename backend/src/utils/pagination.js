// Monta o objeto `meta` da resposta paginada a partir de page/limit/total.
// Centralizado para que todo endpoint de listagem calcule `totalPages` (e
// futuros campos como `hasNextPage`) exatamente da mesma forma.
function buildPaginationMeta({ page, limit, total }) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

  return {
    page,
    limit,
    total,
    totalPages,
  }
}

function toOffset({ page, limit }) {
  return (page - 1) * limit
}

module.exports = { buildPaginationMeta, toOffset }
