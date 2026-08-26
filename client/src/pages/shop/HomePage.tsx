import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Star, Truck, Shield, RotateCcw, Headphones, ArrowRight, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react'
import api from '../../services/api'
import { formatPrice, calculateDiscount } from '../../utils'
import type { Banner, HomepageSection, ProductWithVariant, Testimonial, InformationCard } from '../../types'

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [sections, setSections] = useState<HomepageSection[]>([])
  const [featured, setFeatured] = useState<ProductWithVariant[]>([])
  const [newArrivals, setNewArrivals] = useState<ProductWithVariant[]>([])
  const [bestSellers, setBestSellers] = useState<ProductWithVariant[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [infoCards, setInfoCards] = useState<InformationCard[]>([])
  const [loading, setLoading] = useState(true)
  const [currentBanner, setCurrentBanner] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [bannerRes, sectionRes, featuredRes, newArrivalsRes, bestSellersRes, testimonialRes, infoRes] = await Promise.allSettled([
          api.get('/cms/banners'),
          api.get('/cms/homepage-sections'),
          api.get('/products?isFeatured=true&limit=8'),
          api.get('/products?isNewArrival=true&limit=8'),
          api.get('/products?isBestSeller=true&limit=8'),
          api.get('/cms/testimonials'),
          api.get('/cms/information-cards'),
        ])

        if (bannerRes.status === 'fulfilled') setBanners(bannerRes.value.data.data || [])
        if (sectionRes.status === 'fulfilled') setSections(sectionRes.value.data.data || [])
        if (featuredRes.status === 'fulfilled') setFeatured(featuredRes.value.data.data || [])
        if (newArrivalsRes.status === 'fulfilled') setNewArrivals(newArrivalsRes.value.data.data || [])
        if (bestSellersRes.status === 'fulfilled') setBestSellers(bestSellersRes.value.data.data || [])
        if (testimonialRes.status === 'fulfilled') setTestimonials(testimonialRes.value.data.data || [])
        if (infoRes.status === 'fulfilled') setInfoCards(infoRes.value.data.data || [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % banners.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Hero Banner */}
      {banners.length > 0 && (
        <section className="relative overflow-hidden bg-gray-900">
          <div className="relative h-[400px] md:h-[500px]">
            {banners.map((banner, i) => (
              <div
                key={banner.id}
                className={`absolute inset-0 transition-opacity duration-500 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}
              >
                <img src={banner.image} alt={banner.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute inset-0 flex items-center">
                  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <h1 className="text-3xl font-bold text-white md:text-5xl">{banner.title}</h1>
                    {banner.subtitle && <p className="mt-3 text-lg text-gray-200">{banner.subtitle}</p>}
                    {banner.ctaText && banner.ctaLink && (
                      <Link to={banner.ctaLink} className="mt-6 inline-flex items-center btn-accent">
                        {banner.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentBanner(i)}
                  className={`h-2 w-2 rounded-full transition-colors ${i === currentBanner ? 'bg-white' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Trust Badges */}
      <section className="border-b border-gray-200 bg-white py-6">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 px-4 md:grid-cols-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 justify-center">
            <Truck className="h-8 w-8 text-brand-500" />
            <div>
              <p className="text-sm font-semibold">Free Shipping</p>
              <p className="text-xs text-gray-500">On orders over Rs.999</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Shield className="h-8 w-8 text-brand-500" />
            <div>
              <p className="text-sm font-semibold">Warranty</p>
              <p className="text-xs text-gray-500">Up to 12 months</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <RotateCcw className="h-8 w-8 text-brand-500" />
            <div>
              <p className="text-sm font-semibold">Easy Returns</p>
              <p className="text-xs text-gray-500">7-day return policy</p>
            </div>
          </div>
          <div className="flex items-center gap-3 justify-center">
            <Headphones className="h-8 w-8 text-brand-500" />
            <div>
              <p className="text-sm font-semibold">24/7 Support</p>
              <p className="text-xs text-gray-500">Dedicated support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      {featured.length > 0 && (
        <ProductSection title="Featured Products" subtitle="Handpicked for you" products={featured} viewAllLink="/products?isFeatured=true" />
      )}

      {/* Information Cards */}
      {infoCards.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-3">
            {infoCards.map(card => (
              <div key={card.id} className="card-premium p-6">
                {card.image && <img src={card.image} alt={card.title} className="mb-4 h-48 w-full rounded-lg object-cover" />}
                <h3 className="text-lg font-semibold">{card.title}</h3>
                {card.description && <p className="mt-2 text-sm text-gray-600">{card.description}</p>}
                {card.ctaText && card.ctaLink && (
                  <Link to={card.ctaLink} className="mt-4 inline-flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
                    {card.ctaText} <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New Arrivals */}
      {newArrivals.length > 0 && (
        <ProductSection title="New Arrivals" subtitle="Latest additions" products={newArrivals} viewAllLink="/products?isNewArrival=true" />
      )}

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <ProductSection title="Best Sellers" subtitle="Popular picks" products={bestSellers} viewAllLink="/products?isBestSeller=true" />
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <section className="bg-gray-100 py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-center">What Our Customers Say</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {testimonials.map(t => (
                <div key={t.id} className="card p-6">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`h-4 w-4 ${i < (t.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-gray-600">&ldquo;{t.comment}&rdquo;</p>
                  <div className="mt-4 flex items-center gap-3">
                    {t.customerImage ? (
                      <img src={t.customerImage} alt={t.customerName} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-medium text-brand-600">
                        {t.customerName.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium">{t.customerName}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}

function ProductSection({ title, subtitle, products, viewAllLink }: {
  title: string
  subtitle: string
  products: ProductWithVariant[]
  viewAllLink: string
}) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        <Link to={viewAllLink} className="flex items-center text-sm font-medium text-brand-600 hover:text-brand-700">
          View All <ChevronRight className="ml-1 h-4 w-4" />
        </Link>
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {products.map(product => (
          <Link key={product.id} to={`/products/${product.slug || product.id}`} className="card-premium group p-4">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              <img
                src={product.primaryImage || '/placeholder.png'}
                alt={product.name}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</h3>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-lg font-bold text-brand-600">{formatPrice(product.lowestPrice)}</span>
                {product.highestPrice > product.lowestPrice && (
                  <span className="text-sm text-gray-500">- {formatPrice(product.highestPrice)}</span>
                )}
              </div>
              {product.inStock ? (
                <span className="badge-success badge mt-2">In Stock</span>
              ) : (
                <span className="badge-danger badge mt-2">Out of Stock</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
