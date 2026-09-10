function mapRecurringExpenseRow(row) {
  if (!row) return null
  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    dayOfMonth: row.day_of_month,
    startDate: row.start_date,
    endDate: row.end_date,
    isActive: Boolean(row.is_active),
    card: row.card_id != null ? { id: row.card_id, name: row.card_name, isActive: Boolean(row.card_is_active) } : null,
    notes: row.notes,
    source: row.source,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category: row.category_name != null ? { id: row.category_id, name: row.category_name, color: row.category_color, icon: row.category_icon } : undefined,
  }
}

module.exports = { mapRecurringExpenseRow }
