import { Link } from 'react-router-dom'
import { Heart, Trash2 } from 'lucide-react'
import { useWishlistStore } from '../../stores/wishlistStore'
import api from '../../services/api'
import { formatPrice } from '../../utils'
import { useEffect, useState } from 'react'

export default function WishlistPage() {
  const { items, removeItem } = useWishlistStore()
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (items.length === 0) { setLoading(false); return }
    Promise.all(items.map(id => api.get(`/products/${id}`).then(r => r.data.data).catch(() => null)))
      .then(results => setProducts(results.filter(Boolean)))
      .finally(() => setLoading(false))
  }, [items])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Heart className="mx-auto h-16 w-16 text-gray-300" />
        <h1 className="mt-4 text-2xl font-bold">Your wishlist is empty</h1>
        <Link to="/products" className="btn-primary mt-6 inline-flex">Browse Products</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold">My Wishlist ({items.length})</h1>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map(p => p && (
          <div key={p.id} className="card-premium group p-4">
            <Link to={`/products/${p.slug || p.id}`} className="aspect-square overflow-hidden rounded-lg bg-gray-100 block">
              <img src={p.primaryImage || '/placeholder.svg'} alt={p.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
            </Link>
            <h3 className="mt-3 text-sm font-medium line-clamp-2"><Link to={`/products/${p.slug || p.id}`} className="hover:text-brand-600">{p.name}</Link></h3>
            <p className="mt-1 font-bold text-brand-600">{formatPrice(p.lowestPrice)}</p>
            <button onClick={() => removeItem(p.id)} className="mt-2 flex items-center gap-1 text-xs text-red-500 hover:text-red-700">
              <Trash2 className="h-3 w-3" /> Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
