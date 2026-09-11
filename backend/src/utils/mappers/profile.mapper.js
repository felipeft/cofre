function mapProfileRow(row) {
  if (!row) return null
  return {
    id: row.id,
    provider: 'google',
    email: row.email,
    googleName: row.name,
    displayName: row.display_name || row.name,
    customDisplayName: row.display_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { mapProfileRow }
