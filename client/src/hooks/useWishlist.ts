import { useCallback, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useAuthStore } from '../stores/authStore'
import { useWishlistStore } from '../stores/wishlistStore'
import { wishlistService } from '../services/wishlist.service'
import { unionWishlistIds } from '../utils/discovery/wishlist'

// Optimistic wishlist toggle that mirrors the store locally immediately and
// syncs it to the server when signed in (rolling back on failure). Guests get
// the same behaviour persisted to localStorage via the wishlist store.
export function useWishlist() {
  const user = useAuthStore(s => s.user)
  const addItem = useWishlistStore(s => s.addItem)
  const removeItem = useWishlistStore(s => s.removeItem)
  const hasItem = useWishlistStore(s => s.hasItem)

  const toggle = useCallback((variantId: string, productName?: string) => {
    if (!variantId) return

    const currentlyWished = useWishlistStore.getState().items.includes(variantId)
    const label = (productName || 'Item').length > 40 ? `${(productName || 'Item').slice(0, 40)}…` : productName || 'Item'

    if (currentlyWished) removeItem(variantId)
    else addItem(variantId)
    toast.success(currentlyWished ? 'Removed from wishlist' : 'Added to wishlist')

    if (!user) return
    const request = currentlyWished
      ? wishlistService.removeVariant(variantId)
      : wishlistService.addVariant(variantId)
    request.catch(() => {
      // Roll the optimistic change back so local state stays truthful.
      if (currentlyWished) addItem(variantId)
      else removeItem(variantId)
      toast.error(`Couldn't update wishlist for ${label}. Please try again.`)
    })
  }, [user, addItem, removeItem])

  const has = useCallback((variantId: string) => hasItem(variantId), [hasItem])

  return { toggle, has }
}

// When a user signs in (or reloads while logged in), reconcile the browser
// wishlist with the server wishlist: server stays authoritative on order,
// guest-only items are merged in and then pushed so nothing is lost.
export function useWishlistSync() {
  const userId = useAuthStore(s => s.user?.id)

  useEffect(() => {
    if (!userId) return
    let cancelled = false

    wishlistService.getWishlist()
      .then(entries => {
        if (cancelled) return
        const serverIds = (entries || []).map(entry => entry.variantId).filter(Boolean)
        const local = useWishlistStore.getState().items
        const union = unionWishlistIds(serverIds, local)
        useWishlistStore.getState().setItems(union)

        const toPush = union.filter(id => !serverIds.includes(id))
        if (toPush.length > 0) wishlistService.merge(toPush).catch(() => {})
      })
      .catch(() => { /* session not ready / offline — keep the local list */ })

    return () => { cancelled = true }
  }, [userId])
}