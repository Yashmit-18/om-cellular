import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string
  variantId: string
  productId: string
  name: string
  slug: string
  image: string
  price: number
  discountPrice: number | null
  quantity: number
  stock: number
}

interface CartState {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  refreshItem: (variantId: string, patch: Partial<Pick<CartItem, 'price' | 'discountPrice' | 'stock'>>) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        // A stale product page must never be able to add an unavailable item.
        // Stock is verified again by the server during checkout, but keeping the
        // persisted cart valid avoids an impossible client-side checkout state.
        if (!Number.isFinite(item.stock) || item.stock <= 0) return
        const { items } = get()
        const existing = items.find(i => i.variantId === item.variantId)
        if (existing) {
          set({
            items: items.map(i =>
              i.variantId === item.variantId
                ? { ...i, quantity: Math.min(i.quantity + (item.quantity || 1), i.stock) }
                : i
            ),
          })
        } else {
          set({ items: [...items, { ...item, quantity: item.quantity || 1 }] })
        }
      },

      removeItem: (variantId) => {
        set({ items: get().items.filter(i => i.variantId !== variantId) })
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId)
          return
        }
        set({
          items: get().items.map(i =>
            i.variantId === variantId ? { ...i, quantity: Math.min(quantity, i.stock) } : i
          ),
        })
      },

      refreshItem: (variantId, patch) => {
        set({
          items: get().items.map(i => i.variantId === variantId ? { ...i, ...patch } : i),
        })
      },

      clearCart: () => set({ items: [] }),

      getTotal: () => get().items.reduce((sum, item) => {
        const unitPrice = item.discountPrice ?? item.price
        return sum + (Number.isFinite(unitPrice) ? unitPrice : 0) * item.quantity
      }, 0),

      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'omcellular-cart' }
  )
)
