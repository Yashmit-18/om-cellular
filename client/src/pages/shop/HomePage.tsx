import { Fragment, useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronRight, Star, ArrowRight, Smartphone, DollarSign, Wrench, ArrowLeftRight,
  Phone, Shield, Clock, Award, CheckCircle, ChevronDown, ChevronUp, MessageCircle,
  MapPin, Mail, ExternalLink
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

  // ---- Renderer registry: homepage-section type -> existing section JSX ----

  const renderHero = () => (
    banners.length > 0 ? (
      <section className="relative overflow-hidden bg-navy-950">
        <div className="relative h-[420px] md:h-[520px]">
          {banners.map((banner, i) => (
            <div key={banner.id} className={`absolute inset-0 transition-opacity duration-700 ${i === currentBanner ? 'opacity-100' : 'opacity-0'}`}>
              <img src={banner.image} alt={banner.title} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-r from-navy-950/90 via-navy-950/60 to-transparent" />
              <div className="absolute inset-0 flex items-center">
                <div className="container-custom">
                  <div className="max-w-xl">
                    <h1 className="text-3xl font-bold text-white md:text-5xl leading-tight">{banner.title}</h1>
                    {banner.subtitle && <p className="mt-4 text-lg text-gray-300 leading-relaxed">{banner.subtitle}</p>}
                    {banner.ctaText && banner.ctaLink && (
                      <Link to={banner.ctaLink} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-700 hover:shadow-xl">
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
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((_, i) => (
              <button key={i} onClick={() => setCurrentBanner(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? 'w-8 bg-brand-500' : 'w-1.5 bg-white/40 hover:bg-white/60'}`} />
            ))}
          </div>
        )}
      </section>
    ) : (
      <section className="relative bg-navy-950">
        <div className="container-custom py-20 md:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-white md:text-5xl leading-tight">Your Trusted Mobile Partner</h1>
            <p className="mt-4 text-lg text-gray-300">Buy, Sell, Repair & Exchange - All in one place. Expert service you can trust.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/buy-phones" className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-brand-700">
                <Smartphone className="h-4 w-4" /> Buy Phones
              </Link>
              <Link to="/sell-phone" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
                <DollarSign className="h-4 w-4" /> Sell Your Phone
              </Link>
              <Link to="/repair" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
                <Wrench className="h-4 w-4" /> Repair
              </Link>
            </div>
          </div>
        </div>
      </section>
    )
  )

  const renderFeatured = () => featured.length > 0 && (
    <section className="bg-white py-16">
      <div className="container-custom">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-heading">Featured Products</h2>
            <p className="section-subheading">Handpicked deals for you</p>
          </div>
          <Link to="/products?isFeatured=true" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.slice(0, 8).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
        <div className="mt-6 text-center sm:hidden">
          <Link to="/products" className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            View All Products <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  )

  const renderNewArrivals = (section?: HomepageSection) => newArrivals.length > 0 && (
    <section className="bg-white py-16">
      <div className="container-custom">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-heading">{section?.title || 'New Arrivals'}</h2>
            {section?.subtitle && <p className="section-subheading">{section.subtitle}</p>}
          </div>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {newArrivals.slice(0, 8).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )

  const renderBestSellers = (section?: HomepageSection) => bestSellers.length > 0 && (
    <section className="bg-white py-16">
      <div className="container-custom">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-heading">{section?.title || 'Best Sellers'}</h2>
            {section?.subtitle && <p className="section-subheading">{section.subtitle}</p>}
          </div>
          <Link to="/products" className="hidden items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 sm:inline-flex">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {bestSellers.slice(0, 8).map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  )

  const renderBrands = () => brands.length > 0 && (
    <section className="container-custom py-16">
      <div className="text-center">
        <h2 className="section-heading">Popular Brands</h2>
        <p className="section-subheading">We service all major mobile brands</p>
      </div>
      <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {brands.slice(0, 16).map((brand: any) => (
          <Link key={brand.id || brand._id} to={`/products?brandId=${brand.id || brand._id}`}
            className="card-premium flex flex-col items-center gap-2 p-4 text-center">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} className="h-10 w-10 object-contain" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">
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
      <section className="container-custom py-16">
        <div className="text-center">
          <h2 className="section-heading">{section?.title || 'Popular Brands'}</h2>
          <p className="section-subheading">{section?.subtitle || 'We service all major mobile brands'}</p>
        </div>
        <div className="mt-10 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {items.map((item: any) => (
            <Link key={item.id || item._id} to={`/products?${categories.length > 0 ? 'categoryId' : 'brandId'}=${item.id || item._id}`}
              className="card-premium flex flex-col items-center gap-2 p-4 text-center">
              {item.logo ? (
                <img src={item.logo} alt={item.name} className="h-10 w-10 object-contain" />
              ) : item.image ? (
                <img src={item.image} alt={item.name} className="h-10 w-10 object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">
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
    <section className="container-custom py-16">
      <div className="text-center">
        <h2 className="section-heading">What Our Customers Say</h2>
        <p className="section-subheading">Trusted by hundreds of happy customers</p>
      </div>
      <div className="mt-10 grid gap-6 md:grid-cols-3">
        {testimonials.slice(0, 6).map(t => (
          <div key={t.id} className="card p-6">
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
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-600">
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
                <Link to={section.ctaLink} className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
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
    // No CMS homepage-sections configured (fallback handled outside this helper).
    return null
  }

  // ---- ALWAYS-ON / separately-managed sections (not gated by homepage-sections) ----

  const renderTrustBar = () => (
    <section className="border-b border-gray-200 bg-white">
      <div className="container-custom py-5">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { icon: Award, title: 'Experienced Technicians', desc: 'Skilled professionals' },
            { icon: Shield, title: 'Genuine Parts', desc: 'Quality components' },
            { icon: Clock, title: 'Fast Service', desc: 'Quick turnaround' },
            { icon: CheckCircle, title: 'Transparent Pricing', desc: 'No hidden charges' },
          ].map((item) => (
            <div key={item.title} className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50">
                <item.icon className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  const renderServiceCards = () => (
    <section className="container-custom py-16">
      <div className="text-center">
        <h2 className="section-heading">Our Services</h2>
        <p className="section-subheading">Everything you need for your mobile phone</p>
      </div>
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Smartphone, title: 'Buy Phone', desc: 'Browse our collection of quality phones at competitive prices.', link: '/buy-phones', color: 'bg-blue-50 text-blue-600', border: 'hover:border-blue-200' },
          { icon: DollarSign, title: 'Sell Phone', desc: 'Get the best value for your used phone. Quick evaluation and instant payment.', link: '/sell-phone', color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200' },
          { icon: Wrench, title: 'Phone Repair', desc: 'Expert repair services with genuine parts and warranty.', link: '/repair', color: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200' },
          { icon: ArrowLeftRight, title: 'Exchange Phone', desc: 'Trade in your old phone and get a great deal on a new one.', link: '/exchange', color: 'bg-purple-50 text-purple-600', border: 'hover:border-purple-200' },
        ].map((service) => (
          <Link key={service.title} to={service.link} className={`card-premium group p-6 ${service.border}`}>
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${service.color}`}>
              <service.icon className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{service.title}</h3>
            <p className="mt-2 text-sm text-gray-500 leading-relaxed">{service.desc}</p>
            <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-all group-hover:gap-2">
              Learn More <ArrowRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  )

  const renderSellSection = () => (
    <section className="bg-white py-16">
      <div className="container-custom">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="section-heading">Sell Your Phone in 3 Simple Steps</h2>
            <p className="mt-4 text-gray-500 leading-relaxed">Get the best price for your used phone. Our transparent evaluation process ensures you get a fair deal.</p>
            <div className="mt-8 space-y-6">
              {[
                { step: '1', title: 'Select Your Device', desc: 'Choose your phone brand, model, and storage variant from our database.' },
                { step: '2', title: 'Tell Us Its Condition', desc: 'Answer a few questions about your phone condition for accurate valuation.' },
                { step: '3', title: 'Get Your Price', desc: 'Receive an instant estimated value. Final price confirmed after physical inspection.' },
              ].map((item) => (
                <div key={item.step} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{item.step}</div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{item.title}</h4>
                    <p className="mt-1 text-sm text-gray-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/sell-phone" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
              <DollarSign className="h-4 w-4" /> Sell Your Phone
            </Link>
          </div>
          <div className="hidden lg:block">
            <div className="rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 p-12 text-center">
              <DollarSign className="mx-auto h-16 w-16 text-brand-600" />
              <h3 className="mt-4 text-xl font-bold text-gray-900">Get Instant Valuation</h3>
              <p className="mt-2 text-sm text-gray-600">Enter your phone details and get an estimated price immediately.</p>
              <Link to="/sell-phone" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
                Start Now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )

  const renderRepairSection = () => (
    <section className="container-custom py-16">
      <div className="text-center">
        <h2 className="section-heading">Repair Services</h2>
        <p className="section-subheading">Professional repair with genuine parts and warranty</p>
      </div>
      <div className="mt-10">
        {repairServices.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {repairServices.slice(0, 8).map((service: any, i: number) => (
              <div key={service.id || service.name || i} className="card-premium flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-lg">
                  {REPAIR_ICONS[service.name] || '🔧'}
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-900">{service.name}</span>
                  {service.startingPrice != null && (
                    <p className="text-xs text-gray-500">From {formatPrice(service.startingPrice)}</p>
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
        <Link to="/repair" className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50">
          View All Repair Services <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  )

  const renderInfoCards = () => infoCards.length > 0 && (
    <section className="bg-white py-16">
      <div className="container-custom">
        <div className="grid gap-6 md:grid-cols-3">
          {infoCards.slice(0, 3).map(card => (
            <div key={card.id} className="card-premium p-6">
              {card.image && <img src={card.image} alt={card.title} className="mb-4 h-48 w-full rounded-lg object-cover" />}
              <h3 className="text-lg font-semibold">{card.title}</h3>
              {card.description && <p className="mt-2 text-sm text-gray-600 leading-relaxed">{card.description}</p>}
              {card.ctaText && card.ctaLink && (
                <Link to={card.ctaLink} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
                  {card.ctaText} <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  const renderFaq = () => faqs.length > 0 && (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="section-heading">Frequently Asked Questions</h2>
          <p className="section-subheading">Quick answers to common questions</p>
        </div>
        <div className="mt-10 space-y-3">
          {faqs.slice(0, 6).map((faq, i) => (
            <div key={faq.id} className="card overflow-hidden">
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="flex w-full items-center justify-between p-5 text-left">
                <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                {openFaq === i ? <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" /> : <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />}
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
          <Link to="/faq" className="text-sm font-medium text-brand-600 hover:text-brand-700">View All FAQs <ArrowRight className="inline h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  )

  const renderContact = () => (
    <section className="bg-navy-950 py-16">
      <div className="container-custom">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Need Help With Your Phone?</h2>
            <p className="mt-4 text-gray-400 leading-relaxed">Whether you want to sell, repair, or buy a phone, our team is here to help. Get in touch with us today.</p>
            <div className="mt-8 space-y-4">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <Phone className="h-5 w-5 text-brand-400" /> {settings.business_phone}
                </a>
              )}
              {settings.business_email && (
                <a href={`mailto:${settings.business_email}`} className="flex items-center gap-3 text-gray-300 hover:text-white transition-colors">
                  <Mail className="h-5 w-5 text-brand-400" /> {settings.business_email}
                </a>
              )}
              {settings.business_address && (
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-brand-400" /> {settings.business_address}
                </div>
              )}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700">
                  <Phone className="h-4 w-4" /> Call Now
                </a>
              )}
              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700">
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {settings.google_maps_url && (
                <a href={settings.google_maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur transition-all hover:bg-white/20">
                  <MapPin className="h-4 w-4" /> Get Directions <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            {settings.google_maps_url ? (
              <div className="overflow-hidden rounded-2xl">
                <iframe src={settings.google_maps_url} width="100%" height="300" style={{ border: 0 }} allowFullScreen loading="lazy" className="rounded-2xl" title="Store Location" />
              </div>
            ) : (
              <div className="rounded-2xl bg-white/5 p-12 text-center backdrop-blur">
                <MapPin className="mx-auto h-12 w-12 text-brand-400" />
                <h3 className="mt-4 text-lg font-semibold text-white">Visit Our Store</h3>
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div>
      {hasCmsSections ? (
        <>
          {/* CMS homepage-sections control which content sections appear and their order */}
          {renderGatedContent()}
          {renderTrustBar()}
          {renderServiceCards()}
          {renderSellSection()}
          {renderRepairSection()}
          {renderInfoCards()}
          {renderFaq()}
          {renderContact()}
        </>
      ) : (
        <>
          {/* No homepage-sections configured: preserve the original homepage layout */}
          {renderHero()}
          {renderTrustBar()}
          {renderServiceCards()}
          {renderSellSection()}
          {renderRepairSection()}
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
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-all hover:bg-emerald-600 hover:shadow-xl hover:scale-110"
          aria-label="Chat on WhatsApp">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  )
}

function ProductCard({ product }: { product: ProductWithVariant }) {
  return (
    <Link key={product.id} to={`/products/${product.slug || product.id}`} className="card-premium group p-4">
      <ProductImage
        src={product.primaryImage}
        alt={product.name}
        className="aspect-square rounded-lg"
        imgClassName="transition-transform group-hover:scale-105"
      />
      <div className="mt-4">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2">{product.name}</h3>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-brand-600">{formatPrice(product.lowestPrice)}</span>
          {product.highestPrice > product.lowestPrice && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.highestPrice)}</span>
          )}
        </div>
      </div>
    </Link>
  )
}
