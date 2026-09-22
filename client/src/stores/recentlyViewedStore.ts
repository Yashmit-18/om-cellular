import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { recordViewed } from '../utils/discovery/recentlyViewed'

interface RecentlyViewedState {
  items: string[]
  record: (productId: string) => void
  clear: () => void
}

// Pure rollover rules live in utils/discovery/recentlyViewed (shared with the
// server test suite); this store only keeps the persisted list.
export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      record: (productId) => set({ items: recordViewed(get().items, productId) }),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'omcellular-recently-viewed',
      partialize: (state) => ({ items: state.items }),
    }
  )
)