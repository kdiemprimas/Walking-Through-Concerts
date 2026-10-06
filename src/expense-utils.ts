import type { Expense } from './types'

export const getPlannedTotal = (expense: Expense) => expense.plannedAmount * expense.peopleCount + (expense.depositAmount ?? 0)
export const getActualTotal = (expense: Expense) => expense.actualAmount * expense.peopleCount
export const getCategoryLabel = (expense: Expense) => expense.category === 'Khác' && expense.customCategory ? expense.customCategory : expense.category
