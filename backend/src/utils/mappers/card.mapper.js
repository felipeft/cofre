function mapCardRow(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name,
    creditLimit: row.credit_limit,
    closingDay: row.closing_day,
    dueDay: row.due_day,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { mapCardRow }
