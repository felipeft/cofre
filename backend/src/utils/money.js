function roundCurrency(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100
}

module.exports = { roundCurrency }
