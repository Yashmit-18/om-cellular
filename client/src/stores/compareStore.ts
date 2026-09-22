import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  addToCompare,
  removeFromCompare,
  clearCompare,
  hasCompare,
  normalizeCategoryId,
  EMPTY_COMPARE,
  type CompareSelection,
  type CompareAddError,
} from '../utils/discovery/compare'

interface CompareState extends CompareSelection {
  add: (productId: string, categoryId?: string | null) => CompareAddError | null
  remove: (productId: string) => void
  clear: () => void
  has: (productId: string) => boolean
}

// Pure selection rules live in utils/discovery/compare (also exercised from the
// server test suite); this store only persists the resulting selection.
export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],
      categoryId: null,

      add: (productId, categoryId) => {
        const result = addToCompare(get(), productId, categoryId)
        if (result.error) return result.error
        const next = result.state || EMPTY_COMPARE
        set({ items: next.items, categoryId: normalizeCategoryId(next.categoryId) })
        return null
      },

      remove: (productId) => set(removeFromCompare(get(), productId)),

      clear: () => set(clearCompare()),

      has: (productId) => hasCompare(get(), productId),
    }),
    {
      name: 'omcellular-compare',
      partialize: (state) => ({ items: state.items, categoryId: state.categoryId }),
    }
  )
)