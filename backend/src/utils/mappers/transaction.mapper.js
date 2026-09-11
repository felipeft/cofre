function parseTags(rawTags) {
  try {
    const parsed = JSON.parse(rawTags ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// `row` vem do repository já com as colunas da categoria por causa do JOIN
// (category_name, category_color, category_icon, category_type) — assim a
// listagem não precisa de uma consulta extra por transação (N+1) para o
// frontend poder exibir ícone/cor da categoria direto no TransactionRow.
function mapTransactionRow(row) {
  if (!row) return null

  return {
    id: row.id,
    description: row.description,
    amount: row.amount,
    type: row.type,
    categoryId: row.category_id,
    date: row.date,
    competence: {
      month: row.competence_month,
      year: row.competence_year,
    },
    notes: row.notes,
    source: row.source,
    isRecurring: Boolean(row.is_recurring),
    recurringExpenseId: row.recurring_expense_id ?? null,
    isFixed: Boolean(row.is_fixed),
    // `card` no contrato da API agora é sempre o cartão RELACIONAL
    // (card_id → credit_cards), nunca mais a coluna de texto livre
    // descontinuada na Etapa 8 (ela continua existindo fisicamente no
    // banco, intocada, mas deixou de ser exposta — nada no frontend a lia).
    card: row.card_id != null ? { id: row.card_id, name: row.card_name } : null,
    installments:
      row.installment_current != null || row.installment_total != null
        ? { current: row.installment_current, total: row.installment_total, groupId: row.installment_group_id }
        : null,
    tags: parseTags(row.tags),
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    category:
      row.category_name != null
        ? {
            id: row.category_id,
            name: row.category_name,
            color: row.category_color,
            icon: row.category_icon,
            type: row.category_type,
          }
        : undefined,
  }
}

module.exports = { mapTransactionRow, parseTags }
