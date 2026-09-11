// Fica fora do repository (que só devolve o que o SQLite devolve) e fora do
// controller (que não deveria conhecer nada do formato de banco). O service
// é quem decide qual formato o cliente da API vê.
function mapCategoryRow(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    color: row.color,
    icon: row.icon,
    isActive: Boolean(row.is_active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { mapCategoryRow }
