import { useCallback, useState } from 'react'
import { monthKey, shiftMonthKey } from '@/utils/months'

const FIRST_SUPPORTED_MONTH = '2000-01'
const LAST_SUPPORTED_MONTH = '2100-12'

export function useSelectedMonth() {
  const currentMonth = monthKey()
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const moveMonth = useCallback((amount) => setSelectedMonth((value) => {
    const candidate = shiftMonthKey(value, amount)
    return candidate >= FIRST_SUPPORTED_MONTH && candidate <= LAST_SUPPORTED_MONTH ? candidate : value
  }), [])

  return {
    selectedMonth,
    currentMonth,
    isCurrentMonth: selectedMonth === currentMonth,
    canGoPrevious: selectedMonth > FIRST_SUPPORTED_MONTH,
    canGoNext: selectedMonth < LAST_SUPPORTED_MONTH,
    previousMonth: () => moveMonth(-1),
    nextMonth: () => moveMonth(1),
    resetMonth: () => setSelectedMonth(currentMonth),
  }
}
