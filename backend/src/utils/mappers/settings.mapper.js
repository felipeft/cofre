function mapSettingsRow(row) {
  if (!row) return null
  return {
    defaultOfferRate: row.default_offer_rate,
    defaultTitheRate: row.default_tithe_rate,
    theme: row.theme,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

module.exports = { mapSettingsRow }
