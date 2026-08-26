"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Star,
  Shield,
  Wrench,
  Zap,
  Award,
  Phone,
  Smartphone,
  Headphones,
  Battery,
  RotateCcw,
  Quote,
  ShoppingCart,
  Heart,
  BadgeCheck,
  Settings,
  Camera,
  Droplets,
  Cpu,
  MonitorCheck,
  Fingerprint,
  Wifi,
  Banknote,
  TrendingUp,
  Package,
  Truck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

const API_BASE = "";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image: string;
  ctaText: string | null;
  ctaLink: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  _count: { products: number };
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  images: string;
  storage: string | null;
  ram: string | null;
  color: string | null;
  badge: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isRefurbished: boolean;
  condition: string | null;
  warranty: string | null;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  variants: ProductVariant[];
}

interface Testimonial {
  id: string;
  customerName: string;
  customerImage: string | null;
  rating: number;
  comment: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  expiresAt: string | null;
}

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface Setting {
  key: string;
  value: string;
  group: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getProductImage(product: Product): string {
  const variant = product.variants[0];
  if (!variant) return "/placeholder-product.png";
  try {
    const images: string[] = JSON.parse(variant.images);
    return images[0] || "/placeholder-product.png";
  } catch {
    return "/placeholder-product.png";
  }
}

function getProductPrice(product: Product) {
  const variant = product.variants[0];
  if (!variant) return { price: 0, original: 0, hasDiscount: false, discount: 0 };
  const price = variant.discountPrice || variant.price;
  const hasDiscount = !!variant.discountPrice && variant.discountPrice < variant.price;
  const discount = hasDiscount
    ? Math.round(((variant.price - variant.discountPrice!) / variant.price) * 100)
    : 0;
  return { price, original: variant.price, hasDiscount, discount };
}

// ─── 1. Premium Hero Section ─────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 overflow-hidden min-h-[600px] lg:min-h-[680px] flex items-center">
      {/* Background decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-32 w-full">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left content */}
          <div className="max-w-xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-[1.08] mb-6">
              Your Phone.
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                Our Expertise.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-300 mb-4 leading-relaxed">
              Buy smarter. Sell better. Repair with confidence.
            </p>
            <p className="text-base text-slate-400 mb-10 max-w-md leading-relaxed">
              OM Cellular is your trusted destination for premium smartphones, expert repairs, and fair device trade-ins — all under one roof.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link href="/phones">
                <Button variant="primary" size="lg" className="bg-white text-slate-900 hover:bg-slate-100 font-semibold shadow-lg shadow-white/10">
                  Explore Smartphones <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/repair">
                <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-white/5">
                  Book a Repair
                </Button>
              </Link>
            </div>

            <Link href="/sell-phone" className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium group">
              Sell Your Phone
              <ArrowRight className="h-4 w-4 ml-1 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Right side — decorative phone silhouette */}
          <div className="hidden lg:flex justify-center items-center relative">
            <div className="relative w-[280px] h-[560px]">
              {/* Phone body */}
              <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-b from-slate-700/40 to-slate-800/60 border border-slate-600/30 shadow-2xl shadow-blue-500/10" />
              {/* Screen */}
              <div className="absolute inset-2 rounded-[2.5rem] bg-gradient-to-br from-blue-600/20 via-indigo-500/10 to-slate-800/40 border border-slate-500/20" />
              {/* Notch */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 rounded-full bg-slate-900/80 border border-slate-600/30" />
              {/* Screen glow */}
              <div className="absolute top-1/3 left-1/4 w-1/2 h-1/3 bg-blue-500/10 rounded-full blur-2xl" />
              {/* Floating accent shapes */}
              <div className="absolute -top-8 -right-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/10 rotate-12 blur-sm" />
              <div className="absolute -bottom-6 -left-6 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/10 blur-sm" />
              <div className="absolute top-1/2 -right-12 w-3 h-3 rounded-full bg-blue-400/40 blur-[1px]" />
              <div className="absolute top-1/4 -left-10 w-2 h-2 rounded-full bg-indigo-400/50" />
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="mt-16 lg:mt-20 pt-8 border-t border-slate-800/60">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Shield, label: "Experienced Technicians", desc: "Professional hands-on expertise" },
              { icon: BadgeCheck, label: "Quality Checked Devices", desc: "Every device inspected" },
              { icon: Banknote, label: "Transparent Pricing", desc: "No surprises" },
              { icon: Phone, label: "Local Expert Support", desc: "Real people, real help" },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/50">
                  <item.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-slate-50 to-transparent" />
    </section>
  );
}

// ─── 2. CMS Banner Carousel ──────────────────────────────────────────────────

function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % banners.length);
    }, 5000);
  }, [banners.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  if (banners.length === 0) return null;

  return (
    <section className="relative bg-slate-50 border-b border-slate-100">
      <div className="relative overflow-hidden h-[200px] sm:h-[280px]">
        <div
          className="flex h-full transition-transform duration-700 ease-in-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {banners.map((banner) => (
            <div key={banner.id} className="w-full flex-shrink-0 h-full relative">
              <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${banner.image})` }} />
              <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-transparent" />
              <div className="relative h-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center">
                <div className="max-w-lg">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-sm sm:text-base text-slate-300 mb-4">{banner.subtitle}</p>
                  )}
                  {banner.ctaText && banner.ctaLink && (
                    <Link href={banner.ctaLink}>
                      <Button variant="primary" size="md" className="bg-white text-slate-900 hover:bg-slate-100">
                        {banner.ctaText} <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); resetTimer(); }}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-white" : "w-1.5 bg-white/50 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── 3. Floating Service Navigation ──────────────────────────────────────────

function ServiceNav() {
  const services = [
    { icon: ShoppingCart, title: "Buy", desc: "Browse premium smartphones", href: "/phones" },
    { icon: Banknote, title: "Sell", desc: "Get the best value for your device", href: "/sell-phone" },
    { icon: RotateCcw, title: "Exchange", desc: "Upgrade by trading in your phone", href: "/exchange" },
    { icon: Wrench, title: "Repair", desc: "Expert repairs with genuine parts", href: "/repair" },
  ];

  return (
    <section className="relative z-10 -mt-10 mb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-100">
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {services.map((s, i) => (
              <Link
                key={s.title}
                href={s.href}
                className={`group flex flex-col items-center text-center p-6 sm:p-8 hover:bg-blue-50/50 transition-all duration-200 ${
                  i < services.length - 1
                    ? "lg:border-r border-b lg:border-b-0 border-slate-100"
                    : ""
                }`}
              >
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-50 group-hover:bg-blue-100 transition-colors mb-3">
                  <s.icon className="h-6 w-6 text-slate-700 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 mb-3 hidden sm:block">{s.desc}</p>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 4. Explore by Brand ─────────────────────────────────────────────────────

function BrandSection({ categories }: { categories: Category[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (categories.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Explore by Brand
            </h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base">
              Find devices from the brands you trust
            </p>
          </div>
          <Link
            href="/categories"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors hidden sm:inline-flex items-center gap-1"
          >
            View All Brands <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none" }}
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              href={`/phones?category=${cat.slug}`}
              className="flex-shrink-0 snap-start"
            >
              <div className="w-44 sm:w-52 p-6 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all duration-200 text-center group">
                {cat.image ? (
                  <div className="relative w-14 h-14 mx-auto mb-4 overflow-hidden rounded-xl">
                    <Image src={cat.image} alt={cat.name} fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                    <Smartphone className="h-7 w-7 text-slate-500 group-hover:text-blue-600 transition-colors" />
                  </div>
                )}
                <h3 className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                  {cat.name}
                </h3>
                <p className="text-xs text-slate-400">{cat._count.products} products</p>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link href="/categories" className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            View All Brands <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 5. Premium Product Showcase ──────────────────────────────────────────────

function ProductShowcaseCard({ product }: { product: Product }) {
  const img = getProductImage(product);
  const { price, original, hasDiscount, discount } = getProductPrice(product);
  const variant = product.variants[0];

  return (
    <Link
      href={`/phones/${product.brand?.slug || "unknown"}/${product.slug}`}
      className="group flex-shrink-0 w-[260px] sm:w-[280px] snap-start"
    >
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden hover:shadow-xl hover:shadow-slate-200/50 hover:border-slate-200 transition-all duration-300 h-full">
        <div className="relative aspect-square bg-slate-50 overflow-hidden p-4">
          <Image
            src={img}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform duration-500 group-hover:scale-105"
            sizes="280px"
          />
          <button
            onClick={(e) => e.preventDefault()}
            className="absolute top-3 right-3 p-2 rounded-full bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 hover:bg-white transition-all shadow-sm"
          >
            <Heart className="h-4 w-4" />
          </button>
          {variant?.badge && (
            <Badge variant="warning" size="sm" className="absolute top-3 left-3">{variant.badge}</Badge>
          )}
          {hasDiscount && (
            <Badge variant="danger" size="sm" className="absolute top-3 left-3">-{discount}%</Badge>
          )}
          {!variant?.badge && !hasDiscount && product.isNewArrival && (
            <Badge variant="success" size="sm" className="absolute top-3 left-3">New</Badge>
          )}
          {!variant?.badge && !hasDiscount && !product.isNewArrival && product.isBestSeller && (
            <Badge variant="info" size="sm" className="absolute top-3 left-3">Best Seller</Badge>
          )}
        </div>
        <div className="p-5">
          {product.brand && (
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{product.brand.name}</p>
          )}
          <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors leading-snug">
            {product.name}
          </h3>
          {variant?.storage && variant?.ram && (
            <p className="text-xs text-slate-400 mb-3">{variant.storage} &middot; {variant.ram}</p>
          )}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg font-bold text-slate-900">₹{price.toLocaleString("en-IN")}</span>
            {hasDiscount && (
              <span className="text-sm text-slate-400 line-through">₹{original.toLocaleString("en-IN")}</span>
            )}
          </div>
          <button
            onClick={(e) => e.preventDefault()}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-4 w-4" /> Add to Cart
          </button>
        </div>
      </div>
    </Link>
  );
}

function FeaturedProductsSection({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: "left" | "right") => {
    if (scrollRef.current) {
      const amount = 300;
      scrollRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
    }
  };

  if (products.length === 0) return null;

  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Phones Worth Upgrading To
            </h2>
            <p className="text-slate-500 mt-2 text-sm sm:text-base max-w-lg">
              Handpicked devices. Competitive prices. Quality you can trust.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button onClick={() => scroll("left")} className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <ChevronLeft className="h-5 w-5 text-slate-600" />
            </button>
            <button onClick={() => scroll("right")} className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 transition-colors">
              <ChevronRight className="h-5 w-5 text-slate-600" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((p) => (
            <ProductShowcaseCard key={p.id} product={p} />
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link href="/phones">
            <Button variant="outline" size="lg" className="border-slate-300 text-slate-700 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all">
              View All Smartphones <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 6. Pre-Owned / Refurbished Section ──────────────────────────────────────

function RefurbishedSection({ products }: { products: Product[] }) {
  const conditionColor: Record<string, string> = {
    "Like New": "bg-emerald-100 text-emerald-700",
    "Excellent": "bg-blue-100 text-blue-700",
    "Good": "bg-amber-100 text-amber-700",
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left text */}
          <div className="max-w-lg">
            <Badge variant="info" size="sm" className="mb-4">Pre-Owned</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-4">
              Premium Phones. Smarter Prices.
            </h2>
            <p className="text-slate-500 leading-relaxed mb-8">
              Quality-checked pre-owned smartphones for customers who want more value without compromising on reliability. Every device undergoes a thorough inspection before being offered to you.
            </p>
            <Link href="/phones?refurbished=true">
              <Button variant="primary" size="lg">
                Explore Pre-Owned Phones <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Right product grid or placeholder */}
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {products.slice(0, 4).map((product) => {
                const img = getProductImage(product);
                const { price } = getProductPrice(product);
                const conditionLabel = product.condition || "Good";
                const condClass = conditionColor[conditionLabel] || conditionColor["Good"];

                return (
                  <Link
                    key={product.id}
                    href={`/phones/${product.brand?.slug || "unknown"}/${product.slug}`}
                    className="group"
                  >
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:shadow-lg hover:border-blue-200 transition-all duration-200">
                      <div className="relative aspect-square bg-white rounded-xl overflow-hidden mb-3">
                        <Image src={img} alt={product.name} fill className="object-contain p-3" sizes="200px" />
                        <span className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${condClass}`}>
                          {conditionLabel}
                        </span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-1 mb-1 group-hover:text-blue-600 transition-colors">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        {product.warranty && <span className="flex items-center gap-1"><Shield className="h-3 w-3" />{product.warranty}</span>}
                        <span className="flex items-center gap-1"><Battery className="h-3 w-3" />85%+</span>
                      </div>
                      <p className="text-base font-bold text-slate-900">₹{price.toLocaleString("en-IN")}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-slate-50 rounded-2xl p-10 border border-slate-100 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50">
                <Sparkles className="h-8 w-8 text-blue-500" />
              </div>
              <h4 className="text-lg font-semibold text-slate-900 mb-2">Pre-Owned Collection Coming Soon</h4>
              <p className="text-sm text-slate-500">We&apos;re curating the best quality pre-owned devices for you.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── 7. Repair Expertise (Dark Section) ──────────────────────────────────────

function RepairSection() {
  const repairs = [
    { icon: MonitorCheck, name: "Screen Repair" },
    { icon: Battery, name: "Battery" },
    { icon: Zap, name: "Charging Port" },
    { icon: Camera, name: "Camera" },
    { icon: Headphones, name: "Speaker" },
    { icon: Settings, name: "Software Fix" },
    { icon: Droplets, name: "Water Damage" },
    { icon: Cpu, name: "Motherboard" },
  ];

  return (
    <section className="py-16 sm:py-20 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">
            When Your Phone Needs an Expert.
          </h2>
          <p className="text-slate-400 leading-relaxed">
            From cracked displays to complex hardware issues, our experienced technicians diagnose and repair devices with care.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {repairs.map((r) => (
            <div
              key={r.name}
              className="group p-5 rounded-xl border border-slate-800 hover:border-blue-500/30 bg-slate-800/40 hover:bg-slate-800/80 transition-all duration-200 text-center cursor-default"
            >
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-800 group-hover:bg-blue-500/10 transition-colors">
                <r.icon className="h-6 w-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{r.name}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/repair">
            <Button variant="primary" size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Book a Repair <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/repair">
            <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-white/5">
              View Repair Services
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 8. Why OM Cellular ──────────────────────────────────────────────────────

function WhyOMCellular() {
  const features = [
    {
      title: "Real Mobile Expertise",
      desc: "Hands-on experience with smartphones and repairs. We know devices inside and out.",
    },
    {
      title: "Transparent Recommendations",
      desc: "We recommend what makes sense for your device and budget — no upselling.",
    },
    {
      title: "Quality-Checked Devices",
      desc: "Every product is thoroughly inspected before being offered to customers.",
    },
    {
      title: "Support Beyond the Sale",
      desc: "Our relationship doesn't end at purchase. We're here whenever you need us.",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — decorative element */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50" />
              <div className="absolute inset-6 rounded-2xl bg-gradient-to-br from-blue-100/60 to-indigo-100/60 border border-blue-200/30" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="flex items-center justify-center w-20 h-20 mx-auto mb-4 rounded-2xl bg-white shadow-lg shadow-blue-100/50">
                    <Phone className="h-10 w-10 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold text-slate-900">OM</p>
                  <p className="text-sm font-medium text-blue-600 tracking-widest uppercase">Cellular</p>
                </div>
              </div>
              {/* Floating shapes */}
              <div className="absolute -top-4 -right-4 w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 rotate-6" />
              <div className="absolute -bottom-3 -left-3 w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20" />
            </div>
          </div>

          {/* Right — content */}
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-10">
              Built on Experience.
              <br />
              Trusted for Every Device.
            </h2>

            <div className="space-y-8">
              {features.map((f) => (
                <div key={f.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-1 h-full min-h-[3rem] rounded-full bg-blue-500" />
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">{f.title}</h3>
                    <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 9. Sell Your Phone ──────────────────────────────────────────────────────

function SellPhoneSection() {
  const steps = [
    { num: "01", label: "Select Device", desc: "Choose your phone model" },
    { num: "02", label: "Check Condition", desc: "Answer a few quick questions" },
    { num: "03", label: "Get Value", desc: "Receive an instant estimate" },
    { num: "04", label: "Sell", desc: "Get paid quickly and easily" },
  ];

  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Turn Your Old Phone Into Your Next Upgrade.
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Get an estimated value for your smartphone in just a few simple steps.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {steps.map((s, i) => (
            <div key={s.num} className="relative text-center">
              <div className="flex items-center justify-center w-14 h-14 mx-auto mb-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <span className="text-lg font-bold text-blue-600">{s.num}</span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 mb-1">{s.label}</h4>
              <p className="text-xs text-slate-500">{s.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px bg-slate-200">
                  <ArrowRight className="absolute -right-1 -top-1.5 h-3 w-3 text-slate-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link href="/sell-phone">
            <Button variant="primary" size="lg">
              Get Your Phone&apos;s Value <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 10. Exchange Section ─────────────────────────────────────────────────────

function ExchangeSection() {
  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-3">
            Upgrade Without Starting From Zero.
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Exchange your current smartphone and pay only the difference for your next device.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 mb-10">
          {/* Old Phone Card */}
          <div className="w-full sm:w-52 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100">
              <Smartphone className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">Old Phone</p>
            <p className="text-xs text-slate-500">Your current device</p>
          </div>

          <ArrowRight className="h-5 w-5 text-slate-300 rotate-90 sm:rotate-0 flex-shrink-0" />

          {/* Exchange Value */}
          <div className="w-full sm:w-52 p-6 rounded-2xl bg-blue-50 border border-blue-200 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-blue-100">
              <Banknote className="h-6 w-6 text-blue-600" />
            </div>
            <p className="text-sm font-bold text-blue-700 mb-1">Exchange Value</p>
            <p className="text-xs text-blue-600">Instant estimate</p>
          </div>

          <ArrowRight className="h-5 w-5 text-slate-300 rotate-90 sm:rotate-0 flex-shrink-0" />

          {/* New Phone Card */}
          <div className="w-full sm:w-52 p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-slate-100">
              <Sparkles className="h-6 w-6 text-slate-500" />
            </div>
            <p className="text-sm font-bold text-slate-900 mb-1">New Phone</p>
            <p className="text-xs text-slate-500">Choose your upgrade</p>
          </div>

          <ArrowRight className="h-5 w-5 text-slate-300 rotate-90 sm:rotate-0 flex-shrink-0" />

          {/* Pay Difference */}
          <div className="w-full sm:w-52 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
            <div className="flex items-center justify-center w-12 h-12 mx-auto mb-3 rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <p className="text-sm font-bold text-emerald-700 mb-1">Pay Difference</p>
            <p className="text-xs text-emerald-600">Only the balance</p>
          </div>
        </div>

        <div className="text-center">
          <Link href="/exchange">
            <Button variant="primary" size="lg">
              Start an Exchange <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 11. Offers Section ──────────────────────────────────────────────────────

function OffersSection({ coupons }: { coupons: Coupon[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (coupons.length === 0) return null;

  const gradients = [
    "from-blue-600 to-indigo-600",
    "from-purple-600 to-pink-600",
    "from-cyan-500 to-blue-600",
    "from-indigo-600 to-purple-600",
  ];

  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Smart Deals. Limited Time.
          </h2>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none" }}
        >
          {coupons.map((coupon, i) => (
            <div
              key={coupon.id}
              className={`flex-shrink-0 w-72 sm:w-80 snap-start rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} p-6 text-white shadow-lg`}
            >
              <div className="flex items-center gap-2 mb-3">
                <Tag className="h-5 w-5 opacity-80" />
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Limited Offer</span>
              </div>
              <p className="text-2xl font-bold tracking-wide mb-2 font-mono">{coupon.code}</p>
              {coupon.description && (
                <p className="text-sm text-white/80 mb-4">{coupon.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">
                  {coupon.type === "PERCENTAGE" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
                </span>
                {coupon.expiresAt && (
                  <span className="text-xs text-white/60">
                    Expires {new Date(coupon.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Tag icon (missing from imports) ─────────────────────────────────────────

function Tag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
      <circle cx="7.5" cy="7.5" r=".5" fill="currentColor" />
    </svg>
  );
}

// ─── 12. Trust Metrics ───────────────────────────────────────────────────────

function TrustMetricsSection({ settings }: { settings: Setting[] }) {
  const getVal = (key: string) => settings.find((s) => s.key === key)?.value || "";

  const years = getVal("trust_years");
  const devices = getVal("trust_devices_serviced");
  const customers = getVal("trust_happy_customers");
  const inspected = getVal("trust_devices_inspected");

  const hasData = years || devices || customers || inspected;
  if (!hasData) return null;

  const metrics = [
    { value: years, label: "Years of Experience" },
    { value: devices, label: "Devices Serviced" },
    { value: customers, label: "Happy Customers" },
    { value: inspected, label: "Devices Inspected" },
  ].filter((m) => m.value);

  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 text-center">
          {metrics.map((m) => (
            <div key={m.label}>
              <p className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">{m.value}</p>
              <p className="text-sm text-slate-400 font-medium">{m.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 13. Testimonials ────────────────────────────────────────────────────────

function TestimonialsSection({ testimonials }: { testimonials: Testimonial[] }) {
  const [current, setCurrent] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const fallbackTestimonials: Testimonial[] = [
    { id: "1", customerName: "Rahul S.", customerImage: null, rating: 5, comment: "Got my phone screen replaced in just 30 minutes. The quality is perfect and the pricing was very straightforward." },
    { id: "2", customerName: "Priya M.", customerImage: null, rating: 5, comment: "Excellent place to buy pre-owned phones. My device looks brand new and works perfectly. Highly recommended." },
    { id: "3", customerName: "Amit K.", customerImage: null, rating: 4, comment: "Great experience with the exchange program. Received a fair value for my old phone and the new one was ready quickly." },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCurrent((p) => (p + 1) % displayTestimonials.length);
    }, 5000);
  }, [displayTestimonials.length]);

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [resetTimer]);

  const goTo = (idx: number) => {
    setCurrent(idx);
    resetTimer();
  };

  return (
    <section className="py-16 sm:py-20 bg-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            What Our Customers Say
          </h2>
          <p className="text-slate-500 mt-2">
            Trusted by happy customers
          </p>
        </div>

        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {displayTestimonials.map((t) => (
              <div key={t.id} className="w-full flex-shrink-0 px-4 sm:px-8">
                <div className="max-w-2xl mx-auto text-center">
                  <Quote className="h-10 w-10 text-blue-200 mx-auto mb-6" />
                  <div className="flex items-center justify-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${i < t.rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-300"}`}
                      />
                    ))}
                  </div>
                  <p className="text-lg sm:text-xl text-slate-700 leading-relaxed mb-8 italic">
                    &ldquo;{t.comment}&rdquo;
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex items-center justify-center w-11 h-11 rounded-full bg-blue-50 text-blue-600 font-bold text-sm">
                      {t.customerName.charAt(0)}
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-slate-900 text-sm">{t.customerName}</p>
                      <p className="text-xs text-slate-400">Verified Customer</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => goTo((current - 1 + displayTestimonials.length) % displayTestimonials.length)}
            className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-slate-600" />
          </button>
          <div className="flex gap-2">
            {displayTestimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === current ? "w-8 bg-blue-600" : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
              />
            ))}
          </div>
          <button
            onClick={() => goTo((current + 1) % displayTestimonials.length)}
            className="p-2 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-slate-600" />
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── 14. FAQ ─────────────────────────────────────────────────────────────────

function FAQSection({ faqs }: { faqs: FAQ[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (faqs.length === 0) return null;

  const toggle = (id: string) => setOpenId((prev) => (prev === id ? null : id));

  return (
    <section className="py-16 sm:py-20 bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-0">
          {faqs.slice(0, 8).map((faq) => (
            <div key={faq.id} className="border-b border-slate-200">
              <button
                onClick={() => toggle(faq.id)}
                className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
              >
                <span className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors pr-4">
                  {faq.question}
                </span>
                <ChevronDown
                  className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                    openId === faq.id ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openId === faq.id ? "max-h-96 pb-5" : "max-h-0"
                }`}
              >
                <p className="text-sm text-slate-500 leading-relaxed">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link href="/contact" className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1">
            Still have questions? Contact us <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── 15. Final CTA ───────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight mb-4 max-w-2xl mx-auto leading-snug">
          Looking for a Phone? Need a Repair?
          <br />
          We&apos;ve Got You.
        </h2>
        <p className="text-slate-400 mb-10 max-w-lg mx-auto">
          Talk to OM Cellular today and get expert help for your next mobile decision.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/phones">
            <Button variant="primary" size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Shop Smartphones <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-white/5">
              Talk to an Expert
            </Button>
          </Link>
          <Link href="/repair">
            <Button variant="outline" size="lg" className="border-slate-600 text-white hover:bg-white/5">
              Book a Repair
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function HomePage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [refurbishedProducts, setRefurbishedProducts] = useState<Product[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const results = await Promise.allSettled([
          fetch(`${API_BASE}/api/banners`),
          fetch(`${API_BASE}/api/categories`),
          fetch(`${API_BASE}/api/products?limit=8&isFeatured=true`),
          fetch(`${API_BASE}/api/products?isRefurbished=true&limit=4`),
          fetch(`${API_BASE}/api/coupons`),
          fetch(`${API_BASE}/api/testimonials`),
          fetch(`${API_BASE}/api/faqs?limit=8`),
          fetch(`${API_BASE}/api/settings`),
        ]);

        const safeJson = async (r: PromiseSettledResult<Response>) => {
          if (r.status === "fulfilled" && r.value.ok) {
            try { return await r.value.json(); } catch { return null; }
          }
          return null;
        };

        const [bannersData, categoriesData, featuredData, refurbData, couponsData, testimonialsData, faqsData, settingsData] =
          await Promise.all(results.map(safeJson));

        if (bannersData?.banners) setBanners(bannersData.banners);
        if (categoriesData?.categories) setCategories(categoriesData.categories);
        if (featuredData?.products) setFeaturedProducts(featuredData.products);
        if (refurbData?.products) setRefurbishedProducts(refurbData.products);
        if (couponsData?.coupons) setCoupons(couponsData.coupons);
        if (testimonialsData?.testimonials) setTestimonials(testimonialsData.testimonials);
        if (faqsData?.faqs) setFaqs(faqsData.faqs);
        if (settingsData?.settings) setSettings(settingsData.settings);
      } catch (err) {
        console.error("Homepage fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 h-[600px] lg:h-[680px] flex items-center">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
            <div className="max-w-xl space-y-4">
              <div className="h-16 bg-slate-800/50 rounded-lg w-3/4 animate-pulse" />
              <div className="h-16 bg-slate-800/50 rounded-lg w-1/2 animate-pulse" />
              <div className="h-6 bg-slate-800/30 rounded-full w-2/3 animate-pulse" />
              <div className="h-4 bg-slate-800/20 rounded-full w-1/2 animate-pulse" />
              <div className="flex gap-4 mt-8">
                <div className="h-12 bg-white/10 rounded-xl w-48 animate-pulse" />
                <div className="h-12 border border-white/20 rounded-xl w-36 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
        <div className="py-16 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <LoadingSkeleton variant="product-card" count={4} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeroSection />
      <BannerCarousel banners={banners} />
      <ServiceNav />
      <BrandSection categories={categories} />
      <FeaturedProductsSection products={featuredProducts} />
      <RefurbishedSection products={refurbishedProducts} />
      <RepairSection />
      <WhyOMCellular />
      <SellPhoneSection />
      <ExchangeSection />
      <OffersSection coupons={coupons} />
      <TrustMetricsSection settings={settings} />
      <TestimonialsSection testimonials={testimonials} />
      <FAQSection faqs={faqs} />
      <FinalCTA />
    </div>
  );
}
