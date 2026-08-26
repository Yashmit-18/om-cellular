"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Tag,
  Copy,
  Clock,
  Percent,
  Gift,
  Zap,
} from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Pagination from "@/components/ui/pagination";
import EmptyState from "@/components/ui/empty-state";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import { useToast } from "@/components/ui/toast";

const API_BASE = "";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: string;
  value: number;
  minOrderAmount: number | null;
  maxDiscount: number | null;
  expiresAt: string | null;
  applicableTo: string;
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  images: string;
  storage: string | null;
  ram: string | null;
  badge: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  brand: { name: string; slug: string } | null;
  variants: ProductVariant[];
}

function CouponCard({ coupon }: { coupon: Coupon }) {
  const toast = useToast();
  const copyCode = () => {
    navigator.clipboard.writeText(coupon.code);
    toast.success(`Coupon code "${coupon.code}" copied!`);
  };

  const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();

  return (
    <Card className={`p-5 relative overflow-hidden ${isExpired ? "opacity-60" : ""}`}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-brand-orange/5 rounded-bl-full" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <Badge variant={coupon.type === "PERCENTAGE" ? "info" : "success"} size="md">
            {coupon.type === "PERCENTAGE" ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`}
          </Badge>
          {isExpired && <Badge variant="danger" size="sm">Expired</Badge>}
        </div>
        {coupon.description && (
          <p className="text-sm text-gray-600 mb-3">{coupon.description}</p>
        )}
        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-3">
          <code className="text-sm font-bold text-brand-blue tracking-wider">{coupon.code}</code>
          {!isExpired && (
            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:border-brand-blue hover:text-brand-blue transition-colors cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          {coupon.minOrderAmount && (
            <span className="flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" /> Min order: ₹{coupon.minOrderAmount.toLocaleString("en-IN")}
            </span>
          )}
          {coupon.maxDiscount && (
            <span className="flex items-center gap-1">
              <Percent className="h-3.5 w-3.5" /> Max discount: ₹{coupon.maxDiscount.toLocaleString("en-IN")}
            </span>
          )}
          {coupon.expiresAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> Expires: {new Date(coupon.expiresAt).toLocaleDateString("en-IN")}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}

function DealCard({ product }: { product: Product }) {
  const variant = product.variants[0];
  if (!variant || !variant.discountPrice || variant.discountPrice >= variant.price) return null;

  const images: string[] = (() => {
    try { return JSON.parse(variant.images); } catch { return []; }
  })();
  const discountPct = Math.round(((variant.price - variant.discountPrice) / variant.price) * 100);

  return (
    <Link href={`/phones/${product.brand?.slug || "unknown"}/${product.slug}`}>
      <Card hover className="overflow-hidden group">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={images[0] || "/placeholder-product.png"}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, 25vw"
          />
          <Badge variant="danger" size="md" className="absolute top-3 left-3">
            {discountPct}% OFF
          </Badge>
        </div>
        <div className="p-4">
          {product.brand && <p className="text-xs text-gray-500 mb-1">{product.brand.name}</p>}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-brand-blue transition-colors mb-2">
            {product.name}
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">₹{variant.discountPrice.toLocaleString("en-IN")}</span>
            <span className="text-sm text-gray-400 line-through">₹{variant.price.toLocaleString("en-IN")}</span>
          </div>
          {variant.storage && variant.ram && (
            <p className="text-xs text-gray-500 mt-1">{variant.storage} / {variant.ram}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function OffersPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [dealProducts, setDealProducts] = useState<Product[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [loadingDeals, setLoadingDeals] = useState(true);

  useEffect(() => {
    const fetchCoupons = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/coupons`);
        if (res.ok) {
          const d = await res.json();
          setCoupons(d.coupons || []);
        }
      } catch {
        setCoupons([]);
      } finally {
        setLoadingCoupons(false);
      }
    };

    const fetchDeals = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products?limit=12&sort=price_asc`);
        if (res.ok) {
          const d = await res.json();
          setDealProducts(d.products || []);
        }
      } catch {
        setDealProducts([]);
      } finally {
        setLoadingDeals(false);
      }
    };

    fetchCoupons();
    fetchDeals();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-orange to-brand-orange-dark py-12 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-sm font-medium mb-4 backdrop-blur-sm">
            <Gift className="h-4 w-4" /> Hot Deals & Offers
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">
            Amazing Deals You Can&apos;t Miss
          </h1>
          <p className="text-orange-100 text-lg max-w-xl mx-auto">
            Save big with our exclusive coupons and discounted products. Grab the best deals before they expire!
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12">
        {/* Coupons section */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-orange/10">
              <Tag className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Available Coupons</h2>
              <p className="text-sm text-gray-500">Copy and apply at checkout</p>
            </div>
          </div>

          {loadingCoupons ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded-full w-20 mb-3" />
                  <div className="h-4 bg-gray-200 rounded-full w-full mb-3" />
                  <div className="h-10 bg-gray-200 rounded-lg w-full mb-3" />
                  <div className="h-3 bg-gray-200 rounded-full w-2/3" />
                </div>
              ))}
            </div>
          ) : coupons.length === 0 ? (
            <Card className="p-8 text-center">
              <Tag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No coupons available right now. Check back later!</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {coupons.map((coupon) => (
                <CouponCard key={coupon.id} coupon={coupon} />
              ))}
            </div>
          )}
        </div>

        {/* Discounted products */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-red-50">
              <Zap className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Discounted Products</h2>
              <p className="text-sm text-gray-500">Grab these deals before they are gone</p>
            </div>
          </div>

          {loadingDeals ? (
            <LoadingSkeleton variant="product-card" count={8} />
          ) : (
            <>
              {dealProducts.filter((p) => {
                const v = p.variants[0];
                return v && v.discountPrice && v.discountPrice < v.price;
              }).length === 0 ? (
                <Card className="p-8 text-center">
                  <Percent className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No discounted products at the moment. Check back soon!</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {dealProducts.map((product) => (
                    <DealCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
