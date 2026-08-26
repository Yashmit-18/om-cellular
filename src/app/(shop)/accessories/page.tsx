"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import Card from "@/components/ui/card";
import Badge from "@/components/ui/badge";
import Select from "@/components/ui/select";
import Pagination from "@/components/ui/pagination";
import EmptyState from "@/components/ui/empty-state";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

const API_BASE = "";

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
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  variants: ProductVariant[];
}

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A to Z" },
];

function AccessoryCard({ product }: { product: Product }) {
  const variant = product.variants[0];
  if (!variant) return null;

  const images: string[] = (() => {
    try { return JSON.parse(variant.images); } catch { return []; }
  })();
  const imageUrl = images[0] || "/placeholder-product.png";
  const price = variant.discountPrice || variant.price;
  const hasDiscount = variant.discountPrice && variant.discountPrice < variant.price;
  const discountPct = hasDiscount
    ? Math.round(((variant.price - variant.discountPrice!) / variant.price) * 100)
    : 0;

  return (
    <Link href={`/phones/${product.brand?.slug || "unknown"}/${product.slug}`}>
      <Card hover className="overflow-hidden h-full group">
        <div className="relative aspect-square bg-gray-50 overflow-hidden">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          />
          {variant.badge && (
            <Badge variant="warning" size="sm" className="absolute top-3 left-3">{variant.badge}</Badge>
          )}
          {hasDiscount && (
            <Badge variant="danger" size="sm" className="absolute top-3 right-3">-{discountPct}%</Badge>
          )}
        </div>
        <div className="p-4">
          {product.brand && (
            <p className="text-xs font-medium text-gray-500 mb-1">{product.brand.name}</p>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-brand-blue transition-colors">
            {product.name}
          </h3>
          {variant.color && (
            <p className="text-xs text-gray-500 mb-2">{variant.color}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">₹{price.toLocaleString("en-IN")}</span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">₹{variant.price.toLocaleString("en-IN")}</span>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function AccessoriesPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("newest");
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        category: "accessories",
        page: String(page),
        limit: "20",
        sort,
      });
      const res = await fetch(`${API_BASE}/api/products?${params}`);
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products || []);
        setTotal(d.total || 0);
        setTotalPages(d.totalPages || 1);
      }
    } catch {
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, sort]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Accessories</h1>
          <p className="text-gray-500">
            {loading ? "Loading..." : `${total} accessories found`}
          </p>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div />
          <Select
            options={sortOptions}
            value={sort}
            onChange={(v) => { setSort(v); setPage(1); }}
            placeholder="Sort by"
          />
        </div>

        {loading ? (
          <LoadingSkeleton variant="product-card" count={8} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No accessories found"
            description="Check back later for new accessories"
            actionLabel="Browse All Products"
            onAction={() => router.push("/phones")}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map((product) => (
                <AccessoryCard key={product.id} product={product} />
              ))}
            </div>
            <div className="mt-8">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
