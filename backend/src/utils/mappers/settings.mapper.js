function mapSettingsRow(row) {
  if (!row) return null
  return {
    theme: row.theme,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { mapSettingsRow }
