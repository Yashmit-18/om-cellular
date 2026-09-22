import api from './api'

export interface WishlistEntry {
  id: string
  variantId: string
  productId: string
  createdAt: string
  product: any
}

export const wishlistService = {
  getWishlist: () => api.get('/wishlist').then(r => r.data.data as WishlistEntry[]),

  addVariant: (variantId: string) => api.post(`/wishlist/${variantId}`).then(r => r.data),

  removeVariant: (variantId: string) => api.delete(`/wishlist/${variantId}`).then(r => r.data),

  merge: (variantIds: string[]) => api.post('/wishlist/merge', { variantIds }).then(r => r.data),
}