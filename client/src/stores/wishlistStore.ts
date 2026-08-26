import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  items: string[]
  addItem: (variantId: string) => void
  removeItem: (variantId: string) => void
  toggleItem: (variantId: string) => void
  hasItem: (variantId: string) => boolean
  clearWishlist: () => void
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (variantId) => {
        if (!get().items.includes(variantId)) {
          set({ items: [...get().items, variantId] })
        }
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter(id => id !== variantId) })
      },

      toggleItem: (variantId) => {
        const { items } = get()
        if (items.includes(variantId)) {
          set({ items: items.filter(id => id !== variantId) })
        } else {
          set({ items: [...items, variantId] })
        }
      },

      hasItem: (variantId) => get().items.includes(variantId),

      clearWishlist: () => set({ items: [] }),
    }),
    { name: 'omcellular-wishlist' }
  )
)
