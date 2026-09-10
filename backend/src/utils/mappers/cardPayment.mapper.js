function mapCardPaymentRow(row) {
  if (!row) return null
  return { id: row.id, cardId: row.card_id, amount: row.amount, paidAt: row.paid_at, notes: row.notes, createdAt: row.created_at }
}
module.exports = { mapCardPaymentRow }
