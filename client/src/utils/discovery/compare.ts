// Pure compare-selection rules (no React, no localStorage, no server) so the
// same rollover/category rules can be tested from the server suite AND used
// directly by the pinia-free zustand store. Kept dependency-free on purpose:
// tests/… (server, node:test) import this file across the client boundary.

export const COMPARE_MAX = 4

export interface CompareSelection {
  items: string[]
  categoryId: string | null
}

export type CompareAddError = 'duplicate' | 'max' | 'category' | 'invalid'

export const EMPTY_COMPARE: CompareSelection = { items: [], categoryId: null }

export function normalizeCategoryId(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function hasCompare(state: CompareSelection, productId: string): boolean {
  return typeof productId === 'string' && productId.length > 0 && state.items.includes(productId)
}

// Adds a product to the selection. The first product fixes the category; every
// later product must share it (comparing across categories produces confused
// spec tables). Returns a result describing the new state or the rejection.
export function addToCompare(
  state: CompareSelection,
  productId: string,
  categoryId?: string | null,
): { state: CompareSelection; error?: CompareAddError } {
  const maybeState = state || EMPTY_COMPARE
  if (typeof productId !== 'string' || productId.trim() === '') {
    return { state: maybeState, error: 'invalid' }
  }
  if (maybeState.items.includes(productId)) return { state: maybeState, error: 'duplicate' }
  if (maybeState.items.length >= COMPARE_MAX) return { state: maybeState, error: 'max' }

  const incomingCategory = normalizeCategoryId(categoryId)
  const baseCategory = normalizeCategoryId(maybeState.categoryId)

  if (maybeState.items.length === 0) {
    const next: CompareSelection = { items: [productId], categoryId: incomingCategory }
    return { state: next }
  }

  if (baseCategory && incomingCategory && baseCategory !== incomingCategory) {
    return { state: maybeState, error: 'category' }
  }

  const next: CompareSelection = { items: [...maybeState.items, productId], categoryId: baseCategory || incomingCategory }
  return { state: next }
}

export function removeFromCompare(state: CompareSelection, productId: string): CompareSelection {
  const base = state || EMPTY_COMPARE
  const next = { items: base.items.filter(id => id !== productId), categoryId: base.categoryId }
  if (next.items.length === 0) return EMPTY_COMPARE
  return next
}

export function clearCompare(): CompareSelection {
  return EMPTY_COMPARE
}