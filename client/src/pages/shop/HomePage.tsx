import { Fragment, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Star, ArrowRight, Smartphone, DollarSign, Wrench, ArrowLeftRight,
  Phone, Shield, Clock, CheckCircle, ChevronDown, ChevronUp, MessageCircle,
  MapPin, Mail, ExternalLink, ChevronLeft, ShieldCheck, BadgeCheck, Truck, Sparkles,
  type LucideIcon
} from 'lucide-react'
import api from '../../services/api'
import { formatPrice } from '../../utils'
import ProductImage from '../../components/shop/ProductImage'
import type { Banner, ProductWithVariant, Testimonial, FAQ, InformationCard, HomepageSection } from '../../types'

const REPAIR_ICONS: Record<string, string> = {
  'Screen Repair': '📱', 'Battery Replacement': '🔋', 'Charging Port': '🔌',
  'Back Glass': '💎', 'Water Damage': '💧', 'Camera Repair': '📸',
  'Software Issues': '💻', 'Dead Phone': '🔧',
}

const SERVICE_STYLES: Record<string, { icon: LucideIcon, tile: string, ring: string }> = {
  buy: { icon: Smartphone, tile: 'from-blue-500 to-blue-600', ring: 'hover:shadow-blue-500/20' },
  sell: { icon: DollarSign, tile: 'from-emerald-500 to-emerald-600', ring: 'hover:shadow-emerald-500/20' },
  repair: { icon: Wrench, tile: 'from-amber-500 to-orange-600', ring: 'hover:shadow-amber-500/20' },
  exchange: { icon: ArrowLeftRight, tile: 'from-violet-500 to-purple-600', ring: 'hover:shadow-violet-500/20' },
}

function SectionHeading({ eyebrow, title, subtitle, className = '' }: { eyebrow?: string; title: string; subtitle?: string; className?: string }) {
  return (
    <div className={className}>
      {eyebrow && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-600">
          <Sparkles className="h-3.5 w-3.5" /> {eyebrow}
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
    } catch { /* silently fail */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(() => setCurrentBanner(p => (p + 1) % banners.length), 5000)
    return () => clearInterval(timer)
  }, [banners.length])

  const whatsAppNumber = settings.whatsapp_number || ''
  const whatsAppUrl = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello OM Cellular, I need help with a mobile phone.')}` : ''

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

  const heroCta = (to: string, label: string, icon: LucideIcon, solid: boolean) => (
    <Link to={to} className={solid
      ? 'inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:shadow-brand-500/30 hover:-translate-y-0.5'
      : 'inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20 hover:-translate-y-0.5'}>
      {icon({ className: 'h-4 w-4' })} {label}
    </Link>
  )

  const renderHero = () => (
    banners.length > 0 ? (
      <section className="relative overflow-hidden bg-navy-950">
        <div className="relative h-[440px] md:h-[560px]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {banners.map((banner, i) => (
            <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}>
              <img src={banner.image} alt={banner.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-950/95 via-navy-950/70 to-navy-950/20" />
              <div className="absolute inset-0 flex items-center">
                <div className="container-custom">
                  <div className="max-w-xl">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
                      <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> India&apos;s trusted mobile destination
                    </span>
                    <h1 className="mt-5 text-3xl font-extrabold text-white md:text-5xl leading-tight">{banner.title}</h1>
                    {banner.subtitle && <p className="mt-4 text-base text-gray-300 leading-relaxed md:text-lg">{banner.subtitle}</p>}
                    {banner.ctaText && banner.ctaLink && (
                      <Link to={banner.ctaLink} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/30 transition-all hover:bg-brand-500 hover:-translate-y-0.5">
                        {banner.ctaText} <ArrowRight className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
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
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? 'w-8 bg-brand-500' : 'w-1.5 bg-white/40 hover:bg-white/60'}`} />
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
        <div className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-brand-600/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="container-custom relative py-20 md:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400" /> Buy · Sell · Repair · Exchange
            </span>
            <h1 className="mt-5 text-4xl font-extrabold text-white md:text-5xl leading-tight">Your Trusted Mobile Partner</h1>
            <p className="mt-4 text-lg text-gray-300">Certified used &amp; refurbished phones, honest valuations, and expert repairs — all in one place.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {heroCta('/buy-phones', 'Buy Phones', Smartphone, true)}
              {heroCta('/sell-phone', 'Sell Phone', DollarSign, false)}
              {heroCta('/repair', 'Repair', Wrench, false)}
              {heroCta('/exchange', 'Exchange', ArrowLeftRight, false)}
            </div>
            {repairServices.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-400">
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
      {products.slice(0, 8).map(product => (
        <div key={product.id} className="w-[240px] shrink-0 snap-start sm:w-auto">
          <ProductCard product={product} />
        </div>
      ))}
    </div>
  )

  const renderFeatured = () => featured.length > 0 && (
    <section className="bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Handpicked for you" title="Featured Products" subtitle="Quality-checked phones, ready to ship" />
          <Link to="/products?isFeatured=true" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {productRail(featured)}
        <div className="mt-6 text-center sm:hidden">
          <Link to="/products" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            View All Products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )

  const renderNewArrivals = (section?: HomepageSection) => newArrivals.length > 0 && (
    <section className="bg-gradient-to-b from-white to-gray-50/60 py-14 md:py-20">
      <div className="container-custom">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Just in" title={section?.title || 'New Arrivals'} subtitle={section?.subtitle || 'Freshly stocked certified devices'} />
          <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {productRail(newArrivals)}
      </div>
    </section>
  )

  const renderBestSellers = (section?: HomepageSection) => bestSellers.length > 0 && (
    <section className="bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Most loved" title={section?.title || 'Best Sellers'} subtitle={section?.subtitle || 'Top performing phones this month'} />
          <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        {productRail(bestSellers)}
      </div>
    </section>
  )

  const renderBrands = () => brands.length > 0 && (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="Brand discovery" title="Popular Brands" subtitle="Certified devices from the brands you trust" />
      </div>
      <div className="mt-9 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible md:grid-cols-6 lg:grid-cols-8">
        {brands.slice(0, 16).map((brand: any) => (
          <Link key={brand.id || brand._id} to={`/products?brandId=${brand.id || brand._id}`}
            className="card-premium group flex w-20 shrink-0 snap-start flex-col items-center gap-2 p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:p-4">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} className="h-10 w-10 object-contain transition-transform group-hover:scale-110" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-sm font-bold text-brand-600">
                {brand.name.charAt(0)}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700">{brand.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )

  const renderCategories = (section?: HomepageSection) => {
    const items = categories.length > 0 ? categories.slice(0, 16) : brands.slice(0, 16)
    if (items.length === 0) return null
    return (
      <section className="container-custom py-14 md:py-20">
        <div className="text-center">
          <SectionHeading eyebrow="Explore" title={section?.title || 'Popular Brands'} subtitle={section?.subtitle || 'Certified devices from the brands you trust'} />
        </div>
        <div className="mt-9 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 no-scrollbar sm:grid sm:grid-cols-4 sm:gap-4 sm:overflow-visible md:grid-cols-6 lg:grid-cols-8">
          {items.map((item: any) => (
            <Link key={item.id || item._id} to={`/products?${categories.length > 0 ? 'categoryId' : 'brandId'}=${item.id || item._id}`}
              className="card-premium group flex w-20 shrink-0 snap-start flex-col items-center gap-2 p-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-lg sm:w-auto sm:p-4">
              {item.logo ? (
                <img src={item.logo} alt={item.name} className="h-10 w-10 object-contain transition-transform group-hover:scale-110" />
              ) : item.image ? (
                <img src={item.image} alt={item.name} className="h-10 w-10 object-contain transition-transform group-hover:scale-110" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-brand-100 text-sm font-bold text-brand-600">
                  {item.name.charAt(0)}
                </div>
              )}
              <span className="text-xs font-medium text-gray-700">{item.name}</span>
            </Link>
          ))}
        </div>
      </section>
    )
  }

  const renderTestimonials = () => testimonials.length > 0 && (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="Word of mouth" title="What Our Customers Say" subtitle="Trusted by hundreds of happy customers" />
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.slice(0, 6).map(t => (
          <div key={t.id} className="card-premium p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`h-4 w-4 ${i < (t.rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-600 leading-relaxed">&ldquo;{t.comment}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3 border-t border-gray-100 pt-4">
              {t.customerImage ? (
                <img src={t.customerImage} alt={t.customerName} className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-semibold text-white">
                  {t.customerName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-gray-900">{t.customerName}</span>
            </div>
          </div>
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
                <Link to={section.ctaLink} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:-translate-y-0.5">
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
    custom: (s) => (s ? renderCustom(s) : null),
  }

  const hasCmsSections = homepageSections.length > 0

  // Content sections that are gated/ordered by the CMS homepage-sections.
  const renderGatedContent = () => {
    if (hasCmsSections) {
      return homepageSections.map(section => {
        const renderer = sectionRenderers[section.type]
        if (!renderer) {
          if (import.meta.env.DEV) console.warn(`[HomePage] unknown homepage-section type: "${section.type}"`)
          return null
        }
        return <Fragment key={section.id}>{renderer(section)}</Fragment>
      })
    }
    return null
  }

  // ---- ALWAYS-ON / separately-managed sections (not gated by homepage-sections) ----

  const renderTrustBar = () => (
    <section className="relative overflow-hidden border-b border-white/10 bg-navy-950">
      <div className="absolute inset-0 bg-gradient-to-r from-brand-600/15 via-navy-950 to-violet-600/15" />
      <div className="container-custom relative py-7">
        <div className="grid grid-cols-2 gap-x-4 gap-y-6 md:grid-cols-4">
          {[
            { icon: BadgeCheck, title: '100% Quality Checked', desc: 'Every device verified' },
            { icon: Shield, title: 'Genuine Parts', desc: 'Quality components' },
            { icon: Truck, title: 'Fast Delivery', desc: 'Ships across India' },
            { icon: Clock, title: 'Transparent Pricing', desc: 'No hidden charges' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                <item.icon className="h-5 w-5 text-brand-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  const renderServiceCards = () => (
    <section className="container-custom py-14 md:py-20">
      <div className="text-center">
        <SectionHeading eyebrow="Everything in one place" title="Our Services" subtitle="Buy, sell, repair or exchange — the complete care for your mobile" />
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { key: 'buy', title: 'Buy Phone', desc: 'Certified used & refurbished phones that are quality-checked and delivery-ready.', link: '/buy-phones' },
          { key: 'sell', title: 'Sell Phone', desc: 'Get the best value for your used phone with quick evaluation and instant pricing.', link: '/sell-phone' },
          { key: 'repair', title: 'Phone Repair', desc: 'Expert repairs with genuine parts, upfront pricing, and a service warranty.', link: '/repair' },
          { key: 'exchange', title: 'Exchange Phone', desc: 'Trade in your old phone and walk away with a great deal on your next one.', link: '/exchange' },
        ].map((service) => {
          const style = SERVICE_STYLES[service.key]
          return (
            <Link key={service.key} to={service.link} className={`card-premium group relative overflow-hidden p-6 transition-all hover:-translate-y-1 hover:shadow-xl ${style?.ring || ''}`}>
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br from-brand-500/10 to-transparent transition-transform group-hover:scale-125" />
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg ${style?.tile || 'from-brand-500 to-brand-600'}`}>
                {style?.icon({ className: 'h-6 w-6' })}
              </div>
              <h3 className="mt-5 text-lg font-bold text-gray-900">{service.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{service.desc}</p>
              <div className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-all group-hover:gap-2.5 group-hover:text-brand-700">
                Explore <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )

  const renderDeliveryCta = () => {
    const freeThreshold = parseInt(settings.free_shipping_threshold || '') || 0
    return (
      <section className="container-custom py-4">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 via-brand-700 to-violet-700 px-6 py-12 text-center shadow-xl shadow-brand-600/20 md:px-16 md:py-14">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-violet-400/20 blur-2xl" />
          <Truck className="mx-auto h-10 w-10 text-white/90" />
          <h2 className="mt-4 text-2xl font-extrabold text-white md:text-3xl">Nationwide Delivery, Right to Your Door</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-white/85 leading-relaxed md:text-base">
            {freeThreshold > 0
              ? `Every phone is quality-checked, packed securely, and covered by warranty. Enjoy free delivery on orders above ${formatPrice(freeThreshold)}.`
              : 'Every phone is quality-checked, packed securely, and covered by warranty. Order online and track your device every step of the way.'}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/buy-phones" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
              <Smartphone className="h-4 w-4" /> Shop Phones
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
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
            <SectionHeading eyebrow="Turn old into gold" title="Sell Your Phone in 3 Simple Steps" subtitle="Get the best price for your used phone. Our transparent evaluation process ensures you get a fair deal." />
            <div className="mt-8 space-y-6">
              {[
                { step: '1', title: 'Select Your Device', desc: 'Choose your phone brand, model, and storage variant from our database.' },
                { step: '2', title: 'Tell Us Its Condition', desc: 'Answer a few questions about your phone condition for an accurate valuation.' },
                { step: '3', title: 'Get Your Price', desc: 'Receive an instant estimated value. Final price confirmed after physical inspection.' },
              ].map((item) => (
                <div key={item.step} className="group flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-sm font-bold text-white shadow-md shadow-brand-500/20 transition-transform group-hover:scale-110">{item.step}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/sell-phone" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500 hover:-translate-y-0.5">
              <DollarSign className="h-4 w-4" /> Sell Your Phone
            </Link>
          </div>
          <div className="hidden lg:block">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-12 text-center shadow-xl shadow-brand-600/20">
              <div className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              <DollarSign className="mx-auto h-16 w-16 text-white" />
              <h3 className="mt-4 text-xl font-bold text-white">Get Instant Valuation</h3>
              <p className="mt-2 text-sm text-white/85">Enter your phone details and get an estimated price immediately.</p>
              <Link to="/sell-phone" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-brand-700 shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-xl">
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
        <SectionHeading eyebrow="Expert care" title="Repair Services" subtitle="Professional repair with genuine parts and warranty" />
      </div>
      <div className="mt-10">
        {repairServices.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {repairServices.slice(0, 8).map((service: any, i: number) => (
              <div key={service.id || service.name || i} className="card-premium flex items-center gap-3 rounded-2xl p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-50 to-orange-100 text-lg shadow-sm">
                  {REPAIR_ICONS[service.name] || '🔧'}
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900">{service.name}</span>
                  {service.startingPrice != null && (
                    <p className="text-xs text-gray-500">From <span className="font-semibold text-amber-600">{formatPrice(service.startingPrice)}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
            No repair services are currently listed. Check back soon or <Link to="/repair" className="font-medium text-brand-600 hover:text-brand-700">contact us</Link> for assistance.
          </p>
        )}
      </div>
      <div className="mt-8 text-center">
        <Link to="/repair" className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:border-brand-300 hover:text-brand-700 hover:shadow-md">
          View All Repair Services <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )

  const renderInfoCards = () => infoCards.length > 0 && (
    <section className="bg-white py-14 md:py-20">
      <div className="container-custom">
        <div className="grid gap-6 md:grid-cols-3">
          {infoCards.slice(0, 3).map(card => (
            <div key={card.id} className="card-premium overflow-hidden transition-all hover:-translate-y-1 hover:shadow-xl">
              {card.image && <img src={card.image} alt={card.title} className="h-44 w-full object-cover transition-transform duration-500 hover:scale-105" />}
              <div className="p-6">
                <h3 className="text-lg font-bold text-gray-900">{card.title}</h3>
                {card.description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{card.description}</p>}
                {card.ctaText && card.ctaLink && (
                  <Link to={card.ctaLink} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
                    {card.ctaText} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
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
            <div key={faq.id} className={`card overflow-hidden transition-all ${openFaq === i ? 'border-brand-200 shadow-md' : ''}`}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between p-5 text-left" aria-expanded={openFaq === i}>
                <span className="pr-4 text-sm font-semibold text-gray-900">{faq.question}</span>
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors ${openFaq === i ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {openFaq === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {openFaq === i && (
                <div className="border-t border-gray-100 px-5 pb-5">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link to="/faq" className="text-sm font-semibold text-brand-600 hover:text-brand-700">View All FAQs <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  )

  const renderContact = () => (
    <section className="bg-navy-950 py-16 md:py-20">
      <div className="container-custom">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur">
              <MessageCircle className="h-3.5 w-3.5 text-brand-400" /> We&apos;re here to help
            </span>
            <h2 className="mt-4 text-2xl font-extrabold text-white md:text-3xl">Need Help With Your Phone?</h2>
            <p className="mt-4 text-gray-400 leading-relaxed">Whether you want to sell, repair, or buy a phone, our team is here to help. Get in touch with us today.</p>
            <div className="mt-8 space-y-4">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Phone className="h-4 w-4 text-brand-400" /></span> {settings.business_phone}
                </a>
              )}
              {settings.business_email && (
                <a href={`mailto:${settings.business_email}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10"><Mail className="h-4 w-4 text-brand-400" /></span> {settings.business_email}
                </a>
              )}
              {settings.business_address && (
                <div className="flex items-start gap-3 text-gray-300">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10"><MapPin className="mt-0 h-4 w-4 text-brand-400" /></span> {settings.business_address}
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition-all hover:bg-brand-500">
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
                <MapPin className="mx-auto h-12 w-12 text-brand-400" />
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
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      {hasCmsSections ? (
        <>
          {renderGatedContent()}
          {renderTrustBar()}
          {renderServiceCards()}
          {renderSellSection()}
          {renderRepairSection()}
          {renderDeliveryCta()}
          {renderInfoCards()}
          {renderFaq()}
          {renderContact()}
        </>
      ) : (
        <>
          {renderHero()}
          {renderTrustBar()}
          {renderServiceCards()}
          {renderSellSection()}
          {renderRepairSection()}
          {renderDeliveryCta()}
          {renderFeatured()}
          {renderBrands()}
          {renderInfoCards()}
          {renderTestimonials()}
          {renderFaq()}
          {renderContact()}
        </>
      )}

      {/* WhatsApp Floating Button */}
      {whatsAppUrl && (
        <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-all hover:bg-emerald-600 hover:shadow-xl hover:scale-110 md:bottom-6 md:right-6"
          aria-label="Chat on WhatsApp">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: ProductWithVariant }) {
  return (
    <Link to={`/products/${product.slug || product.id}`} className="card-premium group relative overflow-hidden p-4 transition-all hover:-translate-y-1 hover:shadow-xl">
      {product.isBestSeller && (
        <span className="absolute left-3 top-3 z-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">Best Seller</span>
      )}
      <div className="relative overflow-hidden rounded-2xl bg-gray-100">
        <ProductImage
          src={product.primaryImage}
          alt={product.name}
          className="aspect-square"
          imgClassName="transition-transform duration-500 group-hover:scale-110"
        />
        {product.inStock ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 shadow-sm backdrop-blur">In Stock</span>
        ) : (
          <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-red-500 shadow-sm backdrop-blur">Out of Stock</span>
        )}
      </div>
      <div className="mt-4">
        {product.brand && <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{product.brand.name}</p>}
        <h3 className="mt-0.5 text-sm font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-brand-600">{formatPrice(product.lowestPrice)}</span>
          {product.highestPrice > product.lowestPrice && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.highestPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}