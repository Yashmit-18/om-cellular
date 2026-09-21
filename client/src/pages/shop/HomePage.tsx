import { Fragment, useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Star, ArrowRight, Smartphone, DollarSign, Wrench, ArrowLeftRight,
  Phone, Clock, CheckCircle, ChevronDown, ChevronUp, MessageCircle,
  MapPin, Mail, ExternalLink, ChevronLeft, ShieldCheck, BadgeCheck, Truck,
  BadgePercent, Copy, Loader2, Check, TrendingUp,
  MonitorSmartphone, BatteryCharging, Cable, Gem, Droplets, Camera, Cpu,
  type LucideIcon
} from 'lucide-react'
import api from '../../services/api'
import { formatPrice } from '../../utils'
import ProductCard from '../../components/shop/ProductCard'
import Reveal from '../../components/layout/Reveal'
import type { Banner, ProductWithVariant, Testimonial, FAQ, InformationCard, HomepageSection, PromoCoupon, ServiceabilityCheckResponse } from '../../types'

const REPAIR_ICONS: Record<string, LucideIcon> = {
  'Screen Repair': MonitorSmartphone, 'Battery Replacement': BatteryCharging, 'Charging Port': Cable,
  'Back Glass': Gem, 'Water Damage': Droplets, 'Camera Repair': Camera,
  'Software Issues': Cpu, 'Dead Phone': BatteryCharging,
}

const SERVICE_STYLES: Record<string, { icon: LucideIcon, tile: string, ring: string }> = {
  buy: { icon: Smartphone, tile: 'from-navy-800 to-navy-950', ring: 'hover:shadow-navy-900/15' },
  sell: { icon: DollarSign, tile: 'from-emerald-700 to-emerald-950', ring: 'hover:shadow-emerald-900/15' },
  repair: { icon: Wrench, tile: 'from-navy-800 to-navy-950', ring: 'hover:shadow-navy-900/15' },
  exchange: { icon: ArrowLeftRight, tile: 'from-gold-500 to-gold-700', ring: 'hover:shadow-gold-600/25' },
}

function SectionHeading({ eyebrow, title, subtitle, className = '' }: { eyebrow?: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={className}>
      {eyebrow && (
        <span className="inline-flex items-center gap-2">
          <span className="h-px w-6 bg-gold-500" aria-hidden="true" />
          <span className="eyebrow">{eyebrow}</span>
        </span>
      )}
      <h2 className="section-heading mt-3">{title}</h2>
      {subtitle && <p className="section-subheading">{subtitle}</p>}
    </div>
  )
}

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [featured, setFeatured] = useState<ProductWithVariant[]>([])
  const [newArrivals, setNewArrivals] = useState<ProductWithVariant[]>([])
  const [bestSellers, setBestSellers] = useState<ProductWithVariant[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [infoCards, setInfoCards] = useState<InformationCard[]>([])
  const [brands, setBrands] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [repairServices, setRepairServices] = useState<any[]>([])
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [currentBanner, setCurrentBanner] = useState(0)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [activeCoupons, setActiveCoupons] = useState<PromoCoupon[]>([])
  const [copiedCoupon, setCopiedCoupon] = useState('')
  const [pincode, setPincode] = useState('')
  const [pinStatus, setPinStatus] = useState<'idle' | 'loading' | 'success' | 'unavailable' | 'unconfigured' | 'error'>('idle')
  const [pinResult, setPinResult] = useState<ServiceabilityCheckResponse | null>(null)
  const [pinError, setPinError] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/banners'),
        api.get('/products?isFeatured=true&limit=8'),
        api.get('/testimonials'),
        api.get('/faqs'),
        api.get('/information-cards'),
        api.get('/brands'),
        api.get('/settings'),
        api.get('/repairs/services'),
        api.get('/homepage-sections'),
        api.get('/categories'),
        api.get('/products?isNewArrival=true&limit=8'),
        api.get('/products?isBestSeller=true&limit=8'),
        api.get('/coupons/promo'),
      ])
      if (results[0].status === 'fulfilled') setBanners(results[0].value.data.data || [])
      if (results[1].status === 'fulfilled') setFeatured(results[1].value.data.data || [])
      if (results[2].status === 'fulfilled') setTestimonials(results[2].value.data.data || [])
      if (results[3].status === 'fulfilled') setFaqs(results[3].value.data.data || [])
      if (results[4].status === 'fulfilled') setInfoCards(results[4].value.data.data || [])
      if (results[5].status === 'fulfilled') setBrands(results[5].value.data.data || [])
      if (results[6].status === 'fulfilled') {
        const s = results[6].value.data.data
        if (Array.isArray(s)) {
          const map: Record<string, string> = {}
          s.forEach((item: any) => { map[item.key] = item.value })
          setSettings(map)
        } else if (typeof s === 'object') {
          setSettings(s)
        }
      }
      if (results[7].status === 'fulfilled') setRepairServices(results[7].value.data.data || [])
      if (results[8].status === 'fulfilled') setHomepageSections(results[8].value.data.data || [])
      if (results[9].status === 'fulfilled') setCategories(results[9].value.data.data || [])
      if (results[10].status === 'fulfilled') setNewArrivals(results[10].value.data.data || [])
      if (results[11].status === 'fulfilled') setBestSellers(results[11].value.data.data || [])
      if (results[12].status === 'fulfilled') setActiveCoupons(results[12].value.data.data || [])
    } catch { /* silently fail */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  // Hero art layer: very subtle scale (1 -> 1.04) as the hero scrolls past.
  // Single rAF-throttled passive scroll listener; disabled for reduced motion.
  const heroArtRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (loading) return
    const art = heroArtRef.current
    if (!art) return
    const reduceQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    if (reduceQuery.matches) return
    let frame = 0
    const update = () => {
      frame = 0
      const r = art.getBoundingClientRect()
      if (r.top >= 0) { art.style.transform = 'scale(1)'; return }
      const total = art.offsetHeight || 1
      const t = Math.min(Math.abs(r.top) / total, 1)
      art.style.transform = `scale(${1 + 0.04 * t})`
    }
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update) }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    update()
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [loading])

  const whatsAppNumber = settings.whatsapp_number || ''
  const whatsAppUrl = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(settings.whatsapp_default_message || 'Hello OM Cellular, I need help with a mobile phone.')}` : ''

  const advanceBanner = useCallback((dir: 1 | -1) => {
    if (banners.length <= 1) return
    setCurrentBanner(p => (p + dir + banners.length) % banners.length)
  }, [banners.length])

  const [touchX, setTouchX] = useState<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => setTouchX(e.touches[0].clientX)
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX == null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 40) advanceBanner(dx < 0 ? 1 : -1)
    setTouchX(null)
  }

  const heroCta = (to: string, label: string, Icon: LucideIcon, solid: boolean) => (
    <Link to={to} className={solid
      ? 'inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy-900 shadow-lg transition-all hover:bg-ivory-100'
      : 'inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:border-white/30 hover:bg-white/10'}>
      <Icon className="h-4 w-4" /> {label}
    </Link>
  )

  const renderHero = () => (
    banners.length > 0 ? (
      <section className="relative overflow-hidden bg-navy-950">
        {/* Layered art: imagery + tonal gradient, gently scales as it scrolls past */}
        <div ref={heroArtRef} className="absolute inset-0 will-change-transform">
          {banners.map((banner, i) => (
            <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}>
              <img src={banner.image} alt="" aria-hidden="true" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/20" />
            </div>
          ))}
        </div>
        <div className="relative h-[440px] md:h-[560px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {banners.map((banner, i) => (
            <div key={banner.id} className={`absolute inset-0 flex items-center transition-opacity duration-700 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}>
              <div className="container-custom">
                <div className="max-w-xl">
                  <span className="animate-slide-up animate-fill-both inline-flex items-center gap-2">
                    <span className="h-px w-8 bg-gold-500" aria-hidden="true" />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">Pre-Owned · Refurbished · Verified</span>
                  </span>
                  <h1 className="animate-slide-up animate-fill-both mt-5 text-3xl font-extrabold leading-tight text-white md:text-5xl" style={{ animationDelay: '80ms' }}>{banner.title}</h1>
                  {banner.subtitle && <p className="animate-slide-up animate-fill-both mt-4 text-base leading-relaxed text-gray-300 md:text-lg" style={{ animationDelay: '160ms' }}>{banner.subtitle}</p>}
                  {banner.ctaText && banner.ctaLink && (
                    <Link to={banner.ctaLink} className="animate-slide-up animate-fill-both mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-navy-900 shadow-lg transition-all hover:-translate-y-0.5 hover:bg-ivory-100" style={{ animationDelay: '240ms' }}>
                      {banner.ctaText} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {banners.length > 1 && (
          <>
            <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
              {banners.map((_, i) => (
                <button key={i} onClick={() => setCurrentBanner(i)} aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? 'w-8 bg-gold-400' : 'w-1.5 bg-white/40 hover:bg-white/60'}`} />
              ))}
            </div>
            <button onClick={() => advanceBanner(-1)} aria-label="Previous banner"
              className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => advanceBanner(1)} aria-label="Next banner"
              className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 md:flex">
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </section>
    ) : (
      <section className="relative overflow-hidden bg-navy-950">
        {/* Layered art: radial highlights, gently scales as it scrolls past */}
        <div ref={heroArtRef} className="absolute inset-0 will-change-transform">
          <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-navy-400/10 blur-3xl" />
        </div>
        <div className="container-custom relative py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="animate-slide-up animate-fill-both inline-flex items-center gap-2">
              <span className="h-px w-8 bg-gold-500" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">Pre-Owned · Refurbished · Verified</span>
            </span>
            <h1 className="animate-slide-up animate-fill-both mt-5 text-4xl font-extrabold leading-tight text-white md:text-5xl" style={{ animationDelay: '80ms' }}>Premium Phones. Better Value.</h1>
            <p className="animate-slide-up animate-fill-both mt-4 text-lg leading-relaxed text-gray-300" style={{ animationDelay: '160ms' }}>Certified used &amp; refurbished phones, honest valuations, and expert repairs — all in one place.</p>
            <div className="animate-slide-up animate-fill-both mt-8 flex flex-wrap gap-3" style={{ animationDelay: '240ms' }}>
              {heroCta('/buy-phones', 'Buy Phones', Smartphone, true)}
              {heroCta('/sell-phone', 'Sell Phone', DollarSign, false)}
              {heroCta('/repair', 'Repair', Wrench, false)}
              {heroCta('/exchange', 'Exchange', ArrowLeftRight, false)}
            </div>
            {repairServices.length > 0 && (
              <div className="animate-slide-up animate-fill-both mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400" style={{ animationDelay: '400ms' }}>
                <span className="inline-flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> {repairServices.length} repair services</span>
                {brands.length > 0 && <span className="inline-flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> {brands.length}+ brands supported</span>}
                {featured.length > 0 && <span className="inline-flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> Certified &amp; quality-checked</span>}
              </div>
            )}
          </div>
        </div>
      </section>
    )
  )

  const productRail = (products: ProductWithVariant[]) => (
    <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 no-scrollbar sm:grid sm:mx-0 sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:px-0 md:grid-cols-3 lg:grid-cols-4">
      {products.slice(0, 8).map((product, i) => (
        <div key={product.id} className="flex w-[240px] shrink-0 snap-start sm:w-auto">
          <Reveal delay={Math.min(i * 60, 240)} className="h-full w-full">
            <ProductCard product={product} className="h-full w-full" />
          </Reveal>
        </div>
      ))}
    </div>
  )

  const renderFeatured = () => featured.length > 0 && (
    <section className="bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Curated collection" title="Featured Devices" subtitle="Handpicked certified phones, ready to ship" />
          <Link to="/products?isFeatured=true" className="hidden items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {productRail(featured)}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/products" className="inline-flex items-center gap-1 text-sm font-medium text-navy-700">
            View All Products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )

  const renderNewArrivals = (section?: HomepageSection) => newArrivals.length > 0 && (
    <section className="bg-gradient-to-b from-white to-ivory-50 py-14 md:py-20">
      <div className="container-custom">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Just in" title={section?.title || 'New Arrivals'} subtitle={section?.subtitle || 'Freshly arrived certified devices, selected for everyday performance'} />
          <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {productRail(newArrivals)}
      </div>
    </section>
  )

  const renderBestSellers = (section?: HomepageSection) => (
    <section className="bg-gradient-to-b from-navy-900/[0.05] via-gray-50/40 to-white py-14 md:py-20">
      <div className="container-custom">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Most loved" title={section?.title || 'Best Sellers'} subtitle={section?.subtitle || 'Popular picks from our latest collection.'} />
          <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900 sm:inline-flex">
            View All Phones <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {bestSellers.length > 0 ? (
          productRail(bestSellers)
        ) : (
          <div className="card mt-8 flex flex-col items-center justify-center gap-3 p-12 text-center">
            <TrendingUp className="h-10 w-10 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-900">No best sellers available right now</h3>
            <p className="max-w-md text-sm text-gray-500">Popular phones are being refreshed. Browse the full catalogue while you wait.</p>
            <Link to="/products" className="btn-primary mt-2">Browse All Phones <ArrowRight className="h-4 w-4" /></Link>
          </div>
        )}
      </div>
    </section>
  )

  const renderBrands = () => brands.length > 0 && (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="Brand discovery" title="Popular Brands" subtitle="Certified devices from the brands you trust" />
      </div>
      <div className="mt-9 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible md:grid-cols-6 lg:grid-cols-8">
        {brands.slice(0, 16).map((brand: any, i: number) => (
          <Reveal key={brand.id || brand._id} delay={Math.min(i * 50, 250)} className="snap-start sm:snap-none">
            <Link to={`/products?brandId=${brand.id || brand._id}`}
              className="card-premium group flex w-20 shrink-0 snap-start flex-col items-center gap-2 p-3 text-center sm:w-auto sm:p-4">
              {brand.logo ? (
                <img src={brand.logo} alt={brand.name} className="h-10 w-10 object-contain transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-navy-900 text-sm font-bold text-gold-200">
                  {brand.name.charAt(0)}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700">{brand.name}</span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  )

  const renderCategories = (section?: HomepageSection) => {
    if (categories.length === 0) return null
    return (
      <section className="bg-gradient-to-b from-white to-ivory-50 py-14 md:py-20">
        <div className="container-custom">
          <div className="text-center">
            <SectionHeading eyebrow="Explore" title={section?.title || 'Shop by Category'} subtitle={section?.subtitle || 'Smartphones, tablets, smartwatches and accessories for every need'} />
          </div>
          <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-4">
            {categories.slice(0, 8).map((cat: any, i: number) => (
              <Reveal key={cat.id || cat._id} delay={Math.min(i * 60, 240)}>
                <Link to={`/products?categoryId=${cat.id || cat._id}`}
                  className="card-premium group relative block overflow-hidden p-6 text-center">
                  <div className="pointer-events-none absolute inset-x-0 -top-16 mx-auto h-32 w-32 rounded-full bg-navy-900/5 transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none" />
                  {cat.image ? (
                    <img src={cat.image} alt={cat.name} className="mx-auto h-16 w-16 rounded-2xl object-cover transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none" />
                  ) : (
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-navy-900 text-2xl font-bold text-gold-200 shadow-sm">
                      {cat.name.charAt(0)}
                    </div>
                  )}
                  <h3 className="mt-4 font-semibold text-gray-900">{cat.name}</h3>
                  <p className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-navy-700">
                    View collection <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                  </p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const renderTestimonials = () => testimonials.length > 0 && (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="Word of mouth" title="What Our Customers Say" subtitle="Real reviews from the OM Cellular community" />
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.slice(0, 6).map((t, i) => (
          <Reveal key={t.id} delay={Math.min(i * 60, 240)} className="h-full">
            <div className="card-premium h-full p-6">
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`h-4 w-4 ${j < (t.rating || 0) ? 'fill-gold-400 text-gold-400' : 'text-gray-200'}`} />
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-600 leading-relaxed">&ldquo;{t.comment}&rdquo;</p>
              <div className="mt-4 flex items-center gap-3 border-t border-ivory-200 pt-4">
                {t.customerImage ? (
                  <img src={t.customerImage} alt={t.customerName} className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-navy-900 text-sm font-semibold text-gold-200">
                    {t.customerName.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium text-gray-900">{t.customerName}</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )

  const renderCustom = (section: HomepageSection) => (
    <section className="bg-white py-16" style={section.background ? { backgroundColor: section.background } : undefined}>
      <div className="container-custom">
        <div className="card-premium overflow-hidden">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="p-8 md:p-12">
              <h2 className="section-heading">{section.title}</h2>
              {section.subtitle && <p className="mt-4 text-gray-500 leading-relaxed">{section.subtitle}</p>}
              {section.ctaText && section.ctaLink && (
                <Link to={section.ctaLink} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-950">
                  {section.ctaText} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
            {section.image && (
              <div className="h-64 md:h-full">
                <img src={section.image} alt={section.title} className="h-full w-full object-cover" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  // renderer per supported section type (reuses existing inline section JSX)
  const sectionRenderers: Record<string, (s?: HomepageSection) => React.ReactNode> = {
    banners: renderHero,
    featured_products: renderFeatured,
    new_arrivals: renderNewArrivals,
    best_sellers: renderBestSellers,
    categories: renderCategories,
    testimonials: renderTestimonials,
    promo_banner: () => null,
    custom: (s) => (s ? renderCustom(s) : null),
  }

  const hasCmsSections = homepageSections.length > 0
  const gatedHas = (type: string) => homepageSections.some(s => s.type === type)

  const discountedFeatured = featured.filter(p =>
    (p.variants || []).some(v => (v.discountPrice ?? 0) > 0 && (v.discountPrice ?? v.price) < v.price)
  )

  // Content sections that are gated/ordered by the CMS homepage-sections.
  const renderGatedContent = () => {
    if (hasCmsSections) {
      return homepageSections.map(section => {
        const renderer = sectionRenderers[section.type]
        if (!renderer) {
          if (import.meta.env.DEV) console.warn(`[HomePage] unknown homepage-section type: "${section.type}"`)
          return null
        }
        // The hero handles its own motion; everything else reveals on scroll.
        if (section.type === 'banners') return <Fragment key={section.id}>{renderer(section)}</Fragment>
        return <Reveal key={section.id}>{renderer(section)}</Reveal>
      })
    }
    return null
  }

  // ---- ALWAYS-ON / separately-managed sections (not gated by homepage-sections) ----

  const renderWhyUs = () => (
    <section className="border-t border-gray-100 bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="text-center">
          <SectionHeading eyebrow="Why OM Cellular" title="Built Around Your Mobile" subtitle="Honest pricing, thorough checks and support at every step" />
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: ShieldCheck, title: 'Quality-Checked Devices', desc: 'Every certified phone is inspected and graded before it is listed for sale.' },
            { icon: BadgeCheck, title: 'Transparent Valuation', desc: 'Instant estimates for your phone, then a confirmed price after physical inspection.' },
            { icon: Truck, title: 'Doorstep Pickup & Delivery', desc: 'Sell, exchange or repair with pickup options, and track your order at every step.' },
            { icon: Clock, title: 'Upfront Repair Pricing', desc: 'Clear repair charges before we start work, with genuine parts and a service warranty.' },
            { icon: MessageCircle, title: 'One-to-One Support', desc: 'Call, WhatsApp or email us — a real person helps you before and after your order.' },
            { icon: Smartphone, title: 'Flexible Payment Options', desc: 'Pay by cash on delivery or online at checkout, whichever works for you.' },
          ].map((item, i) => (
            <Reveal key={item.title} delay={Math.min(i * 60, 240)} className="h-full">
              <div className="card-premium group h-full p-6">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy-900 text-gold-300 transition-transform group-hover:scale-105">
                  <item.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )

  const renderPromoStrip = () => {
    const cmsPromos = homepageSections.filter(s => s.type === 'promo_banner')
    const defaults = [
      { id: 'default-buy', title: 'Certified Used & Refurbished Phones', subtitle: 'Quality-checked devices with warranty, ready to ship across India.', ctaText: 'Shop Phones', ctaLink: '/buy-phones', image: '', accent: 'from-navy-900 to-navy-950' },
      { id: 'default-sell', title: 'Trade In or Sell Your Old Phone', subtitle: 'Get an instant estimate, a confirmed price after inspection, and doorstep pickup.', ctaText: 'Sell or Exchange', ctaLink: '/sell-phone', image: '', accent: 'from-emerald-900 to-navy-950' },
      { id: 'default-repair', title: 'Expert Phone Repair', subtitle: 'Genuine parts, upfront pricing and a service warranty on every job.', ctaText: 'Book a Repair', ctaLink: '/repair', image: '', accent: 'from-slate-900 via-navy-900 to-navy-950' },
    ]
    const tiles = (cmsPromos.length > 0 ? cmsPromos : defaults).map((t, i) => ({
      id: t.id || `promo-${i}`,
      title: t.title || 'OM Cellular',
      subtitle: t.subtitle || '',
      ctaText: t.ctaText || 'Learn more',
      ctaLink: t.ctaLink || '/products',
      image: (t as any).image || '',
      accent: (t as any).accent || 'from-navy-900 to-navy-950',
    }))
    return (
      <section className="bg-white pb-2">
        <div className="hairline-champagne" aria-hidden="true" />
        <div className="container-custom pt-10">
          <div className="grid gap-5 md:grid-cols-2">
            {tiles.map((tile, i) => (
              <Link key={tile.id} to={tile.ctaLink}
                className={`group relative block overflow-hidden rounded-2xl p-7 text-white shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-elevated ${i === 0 ? 'md:col-span-2' : ''} bg-gradient-to-br ${tile.accent || 'from-navy-900 to-navy-950'}`}>
                <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/[0.06] transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none" />
                {tile.image && (
                  <img src={tile.image} alt={tile.title} className="absolute inset-0 h-full w-full object-cover opacity-25" />
                )}
                <div className="relative">
                  <ShieldCheck className="h-6 w-6 text-gold-300" />
                  <h2 className="mt-3 text-xl font-extrabold text-white md:text-2xl">{tile.title}</h2>
                  {tile.subtitle && <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/80">{tile.subtitle}</p>}
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gold-200">
                    {tile.ctaText} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    )
  }

  const renderCouponOffers = (coupons: PromoCoupon[]) => (
    <section className="bg-gradient-to-b from-gray-50/60 to-white py-14 md:py-20">
      <div className="container-custom">
        <div className="text-center">
          <SectionHeading eyebrow="Grab a deal" title="Current Offers" subtitle="Apply the code at checkout — the best discount is applied automatically" />
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {coupons.slice(0, 6).map((coupon, i) => (
            <Reveal key={coupon.id} delay={Math.min(i * 60, 240)} className="h-full">
              <div className="card-premium relative h-full overflow-hidden p-6">
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-navy-900/5" />
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-navy-900 px-3 py-1 text-xs font-bold text-gold-200 shadow-sm">
                  <BadgePercent className="h-3.5 w-3.5" /> {coupon.value}{coupon.type === 'PERCENTAGE' ? '% OFF' : ' OFF'}
                </span>
                {coupon.expiresAt && (
                  <span className="text-[11px] font-medium text-gray-400">Valid till {new Date(coupon.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>
              <h3 className="mt-4 text-lg font-bold text-gray-900">{coupon.description || 'Save on your next order'}</h3>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <code className="rounded-lg border border-dashed border-navy-300 bg-navy-50 px-3 py-1.5 text-sm font-bold tracking-wider text-navy-800">{coupon.code}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(coupon.code).then(() => setCopiedCoupon(coupon.id)).catch(() => {})
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors hover:border-navy-300 hover:text-navy-700"
                  aria-label={`Copy code ${coupon.code}`}
                >
                  {copiedCoupon === coupon.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copiedCoupon === coupon.id ? 'Copied' : 'Copy'}
                </button>
              </div>
              {(coupon.minOrderAmount ?? 0) > 0 && (
                <p className="mt-3 text-xs text-gray-400">Min. order {formatPrice(coupon.minOrderAmount!)}{(coupon.maxDiscount ?? 0) > 0 ? ` · up to ${formatPrice(coupon.maxDiscount!)} off` : ''}</p>
              )}
              <Link to="/products" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-colors hover:text-navy-900">
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )

  const renderOffers = () => {
    if (activeCoupons.length > 0) return renderCouponOffers(activeCoupons)
    if (discountedFeatured.length >= 4) {
      return (
        <section className="bg-gradient-to-b from-ivory-50 to-white py-14 md:py-20">
          <div className="container-custom">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeading eyebrow="Limited-time deals" title="Deals & Offers" subtitle="Certified devices at reduced prices, while stock lasts" />
              <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-navy-700 hover:text-navy-900 sm:inline-flex">
                View All <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            {productRail(discountedFeatured)}
          </div>
        </section>
      )
    }
    return null
  }

  const checkPincode = async (pin: string) => {
    const trimmed = pin.trim()
    if (!/^\d{6}$/.test(trimmed)) {
      setPinStatus('error')
      setPinError('Please enter a valid 6-digit PIN code')
      return
    }
    setPinStatus('loading')
    setPinError('')
    try {
      const { data } = await api.post('/serviceability/check', { pincode: trimmed, services: ['delivery'] })
      const result: ServiceabilityCheckResponse = data?.data
      setPinResult(result)
      if (!result.configured) setPinStatus('unconfigured')
      else if (result.serviceable) setPinStatus('success')
      else setPinStatus('unavailable')
    } catch {
      setPinStatus('error')
      setPinError('Could not check your PIN right now. Please try again.')
    }
  }

  const pinHelp = {
    load: 'Checking availability…',
    ok: (city?: string, state?: string) => `Delivery available at ${pincode}` + (city ? `, ${city}${state ? `, ${state}` : ''}` : ''),
    no: (city?: string, _state?: string) => `Delivery is not yet available at ${pincode}` + (city ? ` (${city})` : ''),
    soon: 'We are expanding our delivery coverage — check back soon.',
    err: pinError || 'Could not check your PIN right now. Please try again.',
  }

  const renderServiceCards = () => (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="The full care circle" title="Our Services" subtitle="Buy, sell, repair or exchange — end-to-end care for your mobile" />
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: 'buy', title: 'Buy Phone', desc: 'Certified used & refurbished phones — quality-checked, warranty-backed and delivery-ready.', link: '/buy-phones' },
          { key: 'sell', title: 'Sell Phone', desc: 'Turn your old device into value with an instant quote and doorstep pickup.', link: '/sell-phone' },
          { key: 'repair', title: 'Phone Repair', desc: 'Professional device service with genuine parts and upfront pricing.', link: '/repair' },
          { key: 'exchange', title: 'Exchange Phone', desc: 'Upgrade with less upfront cost by trading in your current device.', link: '/exchange' },
        ].map((service, i) => {
          const style = SERVICE_STYLES[service.key]
          const ServiceIcon = style?.icon ?? Wrench
          return (
            <Reveal key={service.key} delay={Math.min(i * 70, 210)} className="h-full">
              <Link to={service.link} className={`card-premium group relative block h-full overflow-hidden p-6 ${style?.ring || ''}`}>
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-navy-900/[0.04] transition-transform duration-300 group-hover:scale-110 motion-reduce:transition-none" />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${style?.tile || 'from-navy-800 to-navy-950'}`}>
                  <ServiceIcon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-gray-900">{service.title}</h3>
                <p className="mt-2 text-sm text-gray-500 leading-relaxed">{service.desc}</p>
                <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-700 transition-all group-hover:gap-2.5 group-hover:text-navy-900">
                  Explore <ArrowRight className="h-4 w-4" />
                </div>
              </Link>
            </Reveal>
          )
        })}
      </div>
    </section>
  )

  const renderDeliveryCta = () => {
    const freeThreshold = parseInt(settings.free_shipping_threshold || '') || 0
    const delivery = pinResult?.results?.delivery
    return (
      <section className="container-custom py-4">
        <div className="relative overflow-hidden rounded-3xl bg-navy-900 px-6 py-12 text-center shadow-elevated md:px-16 md:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-gold-500/[0.07] blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-white/[0.04] blur-2xl" />
          <Truck className="mx-auto h-10 w-10 text-gold-300" />
          <h2 className="mt-4 text-2xl font-extrabold text-white md:text-3xl">Delivery Right to Your Door</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/80 leading-relaxed md:text-base">
            {freeThreshold > 0
              ? `Every phone is quality-checked, packed securely, and covered by warranty. Enjoy free delivery on orders above ${formatPrice(freeThreshold)}.`
              : 'Every phone is quality-checked, packed securely, and covered by warranty. Order online and track your device every step of the way.'}
          </p>
          <div className="mx-auto mt-7 max-w-md">
            <label htmlFor="pincode-check" className="sr-only">Check delivery PIN code</label>
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] p-2 ring-1 ring-white/15">
              <MapPin className="ml-2 h-5 w-5 shrink-0 text-gold-300" />
              <input
                id="pincode-check"
                type="text"
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                value={pincode}
                onChange={(e) => { setPincode(e.target.value.replace(/\D/g, '')) }}
                onKeyDown={(e) => { if (e.key === 'Enter') checkPincode(pincode) }}
                placeholder="Enter PIN to check delivery"
                className="w-full bg-transparent py-2 text-sm text-white placeholder-white/60 outline-none"
              />
              <button
                type="button"
                onClick={() => checkPincode(pincode)}
                disabled={pinStatus === 'loading' || pincode.length !== 6}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-navy-900 shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pinStatus === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                Check
              </button>
            </div>
            <p role="status" aria-live="polite" className={`mt-3 min-h-5 text-sm font-medium ${
              pinStatus === 'success' ? 'text-emerald-300'
              : pinStatus === 'unavailable' || pinStatus === 'error' ? 'text-amber-300'
              : 'text-white/85'
            }`}>
              {pinStatus === 'loading' && pinHelp.load}
              {pinStatus === 'success' && pinHelp.ok(delivery?.city, delivery?.state)}
              {pinStatus === 'unavailable' && pinHelp.no(delivery?.city, delivery?.state)}
              {pinStatus === 'unconfigured' && pinHelp.soon}
              {pinStatus === 'error' && pinHelp.err}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/buy-phones" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-navy-900 shadow-sm transition-all hover:bg-ivory-100">
              <Smartphone className="h-4 w-4" /> Shop Phones
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/10">
              <MessageCircle className="h-4 w-4" /> Talk to Us
            </Link>
          </div>
        </div>
      </section>
    )
  }

  const renderSellSection = () => (
    <section className="bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Turn old into value" title="Sell Your Phone" subtitle="Instant quote, doorstep pickup, and a confirmed price after inspection — a transparent way to part with your device." />
            <div className="mt-8 space-y-6">
              {[
                { step: '1', title: 'Select Your Device', desc: 'Choose your phone brand, model, and storage variant from our database.' },
                { step: '2', title: 'Tell Us Its Condition', desc: 'Answer a few questions about your phone condition for an accurate valuation.' },
                { step: '3', title: 'Get Your Price', desc: 'Receive an instant estimated value. Final price confirmed after physical inspection.' },
              ].map((item, i) => (
                <Reveal key={item.step} delay={i * 80}>
                  <div className="group flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-navy-900 text-sm font-bold text-gold-200 shadow-sm transition-transform group-hover:scale-105 motion-reduce:transition-none">{item.step}</div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{item.title}</h4>
                      <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
            <Link to="/sell-phone" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-navy-950">
              <DollarSign className="h-4 w-4" /> Sell Your Phone
            </Link>
          </div>
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl bg-navy-900 p-12 text-center shadow-elevated">
              <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-gold-500/[0.1] blur-2xl" />
              <DollarSign className="mx-auto h-16 w-16 text-gold-300" />
              <h3 className="mt-4 text-xl font-bold text-white">Get Instant Valuation</h3>
              <p className="mt-2 text-sm text-white/80">Enter your phone details and get an estimated price immediately.</p>
              <Link to="/sell-phone" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-navy-900 shadow-sm transition-all hover:bg-ivory-100">
                Start Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  const renderRepairSection = () => (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="Expert care" title="Repair Services" subtitle="Professional device service — genuine parts, upfront pricing and a service warranty" />
      </div>
      <div className="mt-10">
        {repairServices.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {repairServices.slice(0, 8).map((service: any, i: number) => (
              <Reveal key={service.id || service.name || i} delay={Math.min(i * 60, 240)} className="h-full">
                <div className="card-premium flex h-full items-center gap-3 p-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  {(() => { const Icon = REPAIR_ICONS[service.name] || Wrench; return <Icon className="h-5 w-5" /> })()}
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">{service.name}</span>
                  {service.startingPrice != null && (
                    <p className="text-xs text-gray-500">From <span className="font-semibold text-gold-700">{formatPrice(service.startingPrice)}</span></p>
                  )}
                </div>
              </div>
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-gray-300 bg-ivory-50 p-6 text-center text-sm text-gray-500">
            No repair services are currently listed. Check back soon or <Link to="/repair" className="font-medium text-navy-700 hover:text-navy-900">contact us</Link> for assistance.
          </p>
        )}
      </div>
      <div className="mt-8 text-center">
        <Link to="/repair" className="btn-secondary">
          View All Repair Services <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )

  const renderInfoCards = () => infoCards.length > 0 && (
    <section className="bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="grid gap-6 md:grid-cols-3">
          {infoCards.slice(0, 3).map((card, i) => (
            <Reveal key={card.id} delay={Math.min(i * 80, 240)} className="h-full">
              <div className="card-premium group h-full overflow-hidden">
                {card.image && <img src={card.image} alt={card.title} className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />}
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
                  {card.description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{card.description}</p>}
                  {card.ctaText && card.ctaLink && (
                    <Link to={card.ctaLink} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-navy-700 hover:text-navy-900">
                      {card.ctaText} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )

  const renderFaq = () => faqs.length > 0 && (
    <section className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <SectionHeading eyebrow="Need clarity?" title="Frequently Asked Questions" subtitle="Quick answers to common questions" />
        </div>
        <div className="mt-10 space-y-3">
          {faqs.slice(0, 6).map((faq, i) => (
            <div key={faq.id} className={`card overflow-hidden transition-all ${openFaq === i ? 'border-navy-200 shadow-card-hover' : ''}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between p-5 text-left" aria-expanded={openFaq === i}>
                <span className="pr-4 text-sm font-semibold text-gray-900">{faq.question}</span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${openFaq === i ? 'bg-navy-900 text-gold-200' : 'bg-gray-100 text-gray-500'}`}>
                  {openFaq === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {openFaq === i && (
                <div className="animate-fade-in border-t border-gray-100 px-5 pb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/faq" className="text-sm font-semibold text-navy-700 hover:text-navy-900">View All FAQs <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  )

  const renderContact = () => (
    <section className="bg-navy-950 py-16 md:py-20">
      <div className="container-custom">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2">
              <span className="h-px w-6 bg-gold-500" aria-hidden="true" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">We&apos;re here to help</span>
            </span>
            <h2 className="mt-4 text-2xl font-extrabold text-white md:text-3xl">Need Help With Your Phone?</h2>
            <p className="mt-4 text-gray-400 leading-relaxed">Whether you want to sell, repair, or buy a phone, our team is here to help. Get in touch with us today.</p>
            <div className="mt-8 space-y-4">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Phone className="h-4 w-4 text-gold-300" /></span> {settings.business_phone}
                </a>
              )}
              {settings.business_email && (
                <a href={`mailto:${settings.business_email}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Mail className="h-4 w-4 text-gold-300" /></span> {settings.business_email}
                </a>
              )}
              {settings.business_address && (
                <div className="flex items-start gap-3 text-gray-300">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><MapPin className="mt-0 h-4 w-4 text-gold-300" /></span> {settings.business_address}
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="inline-flex items-center gap-2 rounded-xl bg-gold-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gold-700">
                  <Phone className="h-4 w-4" /> Call Now
                </a>
              )}
              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-500">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {settings.google_maps_url && (
                <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
                  <MapPin className="h-4 w-4" /> Get Directions <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            {settings.google_maps_url ? (
              <div className="overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
                <iframe src={settings.google_maps_url} width="100%" height="320" style={{ border: 0 }} allowFullScreen loading="lazy" className="rounded-3xl" title="Store Location" />
              </div>
            ) : (
              <div className="rounded-3xl bg-white/5 p-12 text-center backdrop-blur ring-1 ring-white/10">
                <MapPin className="mx-auto h-12 w-12 text-gold-300" />
                <h3 className="mt-4 text-lg font-bold text-white">Visit Our Store</h3>
                <p className="mt-2 text-sm text-gray-400">Come visit us for in-person service and consultation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-navy-700 border-t-transparent" />
      </div>
    )
  }

  const revealSection = (node: React.ReactNode) => (node ? <Reveal>{node}</Reveal> : null)

  return (
    <div>
      {renderHero()}
      {revealSection(renderPromoStrip())}
      {hasCmsSections && renderGatedContent()}
      {revealSection(renderServiceCards())}
      {revealSection(!gatedHas('featured_products') && renderFeatured())}
      {revealSection(renderOffers())}
      {revealSection(renderBrands())}
      {revealSection(!gatedHas('categories') && renderCategories())}
      {revealSection(renderWhyUs())}
      {revealSection(!hasCmsSections && renderSellSection())}
      {revealSection(!hasCmsSections && renderRepairSection())}
      {revealSection(renderDeliveryCta())}
      {revealSection(renderInfoCards())}
      {revealSection(!gatedHas('testimonials') && renderTestimonials())}
      {revealSection(renderFaq())}
      {revealSection(renderContact())}
    </div>
  )
}