import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistStore {
  items: string[]
  toggleItem: (variantId: string) => void
  clearWishlist: () => void
  isInWishlist: (variantId: string) => boolean
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      toggleItem: (variantId) => {
        set((state) => {
          const exists = state.items.includes(variantId)
          return {
            items: exists
              ? state.items.filter((id) => id !== variantId)
              : [...state.items, variantId],
          }
        })
      },

      clearWishlist: () => set({ items: [] }),

      isInWishlist: (variantId) => {
        return get().items.includes(variantId)
      },
    }),
    {
      name: 'omcellular-wishlist',
    }
  )
)
