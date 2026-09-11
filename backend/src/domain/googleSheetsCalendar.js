function yearsFromStart(startYear, currentYear) {
  if (!Number.isInteger(startYear) || !Number.isInteger(currentYear) || startYear > currentYear) return []
  return Array.from({ length: currentYear - startYear + 1 }, (_, index) => startYear + index)
}

function missingYearSheets(existingTitles, startYear, currentYear) {
  const existing = new Set(existingTitles.map(String))
  return yearsFromStart(startYear, currentYear).filter((year) => !existing.has(String(year)))
}

module.exports = { yearsFromStart, missingYearSheets }
