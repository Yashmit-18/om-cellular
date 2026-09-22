import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Trash2, AlertTriangle, UserRound } from 'lucide-react'
import toast from 'react-hot-toast'
import { useWishlistStore } from '../../stores/wishlistStore'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import { wishlistService, type WishlistEntry } from '../../services/wishlist.service'
import ProductCard, { ProductCardSkeleton } from '../../components/shop/ProductCard'

export default function WishlistPage() {
  const user = useAuthStore(s => s.user)
  const { items, removeItem, setItems } = useWishlistStore()
  const [entries, setEntries] = useState<WishlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Guests resolve the stored variant ids one by one; signed-in users fetch a
  // single server response. Either way the store stays the local mirror.
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(false)

    if (user) {
      wishlistService.getWishlist()
        .then(list => {
          if (!active) return
          const clean = (list || []).filter(entry => entry?.variantId && entry?.product)
          setEntries(clean)
          setItems(clean.map(entry => entry.variantId))
        })
        .catch(() => { if (active) { setError(true); setEntries([]) } })
        .finally(() => { if (active) setLoading(false) })
      return () => { active = false }
    }

    const idsKey = items.join(',')
    if (idsKey === '') { setLoading(false); setEntries([]); return }

    Promise.all(items.map(storedId =>
      api.get(`/products/by-variant/${storedId}`)
        .then(r => ({ id: storedId, variantId: storedId, productId: r.data.data?.id, createdAt: '', product: r.data.data }))
        .catch(() => null)
    ))
      .then(results => {
        if (!active) return
        const resolved = (results.filter(Boolean) as WishlistEntry[]).filter(entry => entry.product)
        setEntries(resolved)
        setItems(resolved.map(entry => entry.variantId))
        // A wholly stale selection (deactivated variants) resolves to nothing.
        setError(resolved.length === 0 && results.some(r => r === null))
      })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
    // Intentionally re-runs when the guest list changes after a removal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, items.join(',')])

  const handleRemove = (entry: WishlistEntry) => {
    removeItem(entry.variantId)
    setEntries(prev => prev.filter(e => e.variantId !== entry.variantId))
    if (user) wishlistService.removeVariant(entry.variantId).catch(() => {})
    toast.success('Removed from wishlist')
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3, 4, 5, 6, 7].map(i => <ProductCardSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6 lg:px-8">
        {!user && (
          <div className="mx-auto mb-8 flex max-w-xl flex-col items-center justify-between gap-3 rounded-2xl border border-navy-900/10 bg-ivory-100/60 px-5 py-4 sm:flex-row sm:text-left">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-gold-200"><UserRound className="h-5 w-5" /></span>
              <p className="text-sm text-navy-800">Sign in to keep your wishlist synced across devices.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link to="/login" className="btn-primary !px-4 !py-2 text-sm">Sign In</Link>
              <Link to="/buy-phones" className="btn-secondary !px-4 !py-2 text-sm">Browse {''}</Link>
            </div>
          </div>
        )}
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-400"><Heart className="h-7 w-7" /></div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">Your wishlist is empty</h1>
        <p className="mt-2 text-gray-500">Save phones you love and find them here anytime.</p>
        <Link to="/buy-phones" className="btn-primary mt-6 inline-flex">Browse Phones</Link>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm">
              <Heart className="h-3.5 w-3.5" /> Saved for later
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-gray-900 md:text-3xl">My Wishlist ({entries.length})</h1>
          </div>
        </div>

        {error && entries.length === 0 && (
          <div className="card mt-8 p-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500"><AlertTriangle className="h-7 w-7" /></div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">Couldn’t load your wishlist</h3>
            <p className="mt-1.5 text-sm text-gray-500">Something went wrong while fetching your saved phones. Please try again.</p>
            <button onClick={() => window.location.reload()} className="btn-primary mt-6">Retry</button>
          </div>
        )}

        <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {entries.map(entry => {
            const unavailable = !entry.product.inStock
            return (
              <div key={entry.id || entry.variantId} className="flex h-full flex-col">
                <ProductCard product={entry.product} showWishlist={false} className="h-full w-full" />
                {unavailable && (
                  <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800 ring-1 ring-amber-100">
                    Currently unavailable.
                    <Link to="/buy-phones" className="ml-1 font-semibold underline underline-offset-2 hover:text-amber-900">View similar</Link>
                  </div>
                )}
                <button
                  onClick={() => handleRemove(entry)}
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 px-3 text-sm font-medium text-red-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Remove ${entry.product.name} from wishlist`}
                >
                  <Trash2 className="h-4 w-4" /> Remove from wishlist
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}