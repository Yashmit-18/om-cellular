import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  items: string[]
  addItem: (variantId: string) => void
  removeItem: (variantId: string) => void
  toggleItem: (variantId: string) => void
  hasItem: (variantId: string) => boolean
  setItems: (variantIds: string[]) => void
  clearWishlist: () => void
}

const MAX_WISHLIST_ITEMS = 100
const OBJECT_ID_RE = /^[0-9a-f]{24}$/i

function validVariantId(value: unknown): value is string {
  return typeof value === 'string' && OBJECT_ID_RE.test(value)
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (variantId) => {
        if (validVariantId(variantId) && get().items.length < MAX_WISHLIST_ITEMS && !get().items.includes(variantId)) {
          set({ items: [...get().items, variantId] })
        }
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter(id => id !== variantId) })
      },

      toggleItem: (variantId) => {
        if (!validVariantId(variantId)) return
        const { items } = get()
        if (items.includes(variantId)) {
          set({ items: items.filter(id => id !== variantId) })
        } else if (items.length < MAX_WISHLIST_ITEMS) {
          set({ items: [...items, variantId] })
        }
      },

      hasItem: (variantId) => get().items.includes(variantId),

      setItems: (variantIds) => set({ items: Array.isArray(variantIds) ? variantIds.filter(validVariantId).slice(0, MAX_WISHLIST_ITEMS) : [] }),

      clearWishlist: () => set({ items: [] }),
    }),
    { name: 'omcellular-wishlist' }
  )
)
