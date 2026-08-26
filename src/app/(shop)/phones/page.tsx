"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams, useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  ChevronUp,
  Star,
  Search,
  Grid3X3,
  LayoutGrid,
  Filter,
} from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Pagination from "@/components/ui/pagination";
import EmptyState from "@/components/ui/empty-state";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

const API_BASE = "";

interface Brand {
  id: string;
  name: string;
  slug: string;
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
  stock: number;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  condition: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isRefurbished: boolean;
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

const storageOptions = ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB"];
const ramOptions = ["2GB", "3GB", "4GB", "6GB", "8GB", "12GB", "16GB"];
const conditionOptions = ["New", "Refurbished", "Used - Excellent", "Used - Good", "Used - Fair"];

function ProductCard({ product }: { product: Product }) {
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
            <Badge variant="warning" size="sm" className="absolute top-3 left-3">
              {variant.badge}
            </Badge>
          )}
          {hasDiscount && (
            <Badge variant="danger" size="sm" className="absolute top-3 right-3">
              -{discountPct}%
            </Badge>
          )}
          {product.isNewArrival && !variant.badge && (
            <Badge variant="success" size="sm" className="absolute top-3 left-3">New</Badge>
          )}
          {product.isBestSeller && !variant.badge && !product.isNewArrival && (
            <Badge variant="info" size="sm" className="absolute top-3 left-3">Best Seller</Badge>
          )}
        </div>
        <div className="p-4">
          {product.brand && (
            <p className="text-xs font-medium text-gray-500 mb-1">{product.brand.name}</p>
          )}
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-brand-blue transition-colors">
            {product.name}
          </h3>
          {product.condition && (
            <Badge
              variant={product.condition === "New" ? "success" : product.condition === "Refurbished" ? "info" : "default"}
              size="sm"
              className="mb-2"
            >
              {product.condition}
            </Badge>
          )}
          {variant.storage && variant.ram && (
            <p className="text-xs text-gray-500 mb-2">{variant.storage} / {variant.ram}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">₹{price.toLocaleString("en-IN")}</span>
            {hasDiscount && (
              <span className="text-sm text-gray-400 line-through">₹{variant.price.toLocaleString("en-IN")}</span>
            )}
          </div>
          {variant.stock <= 0 && (
            <p className="text-xs text-red-500 mt-1 font-medium">Out of Stock</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

function FilterCheckbox({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
  count?: number;
}) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-brand-blue focus:ring-brand-blue/20 cursor-pointer"
      />
      <span className="text-sm text-gray-700 group-hover:text-gray-900 flex-1">{label}</span>
      {count !== undefined && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </label>
  );
}

function FilterSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full text-left cursor-pointer"
      >
        <span className="font-medium text-gray-900 text-sm">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

function PhonesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "newest";
  const brandFilter = searchParams.get("brand") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const storageFilter = searchParams.get("storage") || "";
  const ramFilter = searchParams.get("ram") || "";
  const conditionFilter = searchParams.get("condition") || "";
  const categoryFilter = searchParams.get("category") || "";

  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);
  const priceTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const updateParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/phones?${params.toString()}`);
    },
    [searchParams, router]
  );

  const clearAllFilters = useCallback(() => {
    router.push("/phones");
  }, [router]);

  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (brandFilter) activeFilters.push({ key: "brand", label: brands.find((b) => b.slug === brandFilter)?.name || brandFilter, value: brandFilter });
  if (minPrice) activeFilters.push({ key: "minPrice", label: `Min ₹${minPrice}`, value: minPrice });
  if (maxPrice) activeFilters.push({ key: "maxPrice", label: `Max ₹${maxPrice}`, value: maxPrice });
  if (storageFilter) activeFilters.push({ key: "storage", label: storageFilter, value: storageFilter });
  if (ramFilter) activeFilters.push({ key: "ram", label: ramFilter, value: ramFilter });
  if (conditionFilter) activeFilters.push({ key: "condition", label: conditionFilter, value: conditionFilter });
  if (categoryFilter) activeFilters.push({ key: "category", label: categoryFilter, value: categoryFilter });

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/brands`);
        if (res.ok) {
          const d = await res.json();
          setBrands(d.brands || []);
        }
      } catch {}
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", "20");
        params.set("sort", sort);
        if (brandFilter) params.set("brand", brandFilter);
        if (minPrice) params.set("minPrice", minPrice);
        if (maxPrice) params.set("maxPrice", maxPrice);
        if (storageFilter) params.set("storage", storageFilter);
        if (ramFilter) params.set("ram", ramFilter);
        if (conditionFilter) params.set("condition", conditionFilter);
        if (categoryFilter) params.set("category", categoryFilter);

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
    };

    fetchProducts();
  }, [page, sort, brandFilter, minPrice, maxPrice, storageFilter, ramFilter, conditionFilter, categoryFilter]);

  useEffect(() => {
    setLocalMinPrice(minPrice);
    setLocalMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  const handlePriceChange = (key: string, value: string) => {
    if (key === "minPrice") setLocalMinPrice(value);
    else setLocalMaxPrice(value);

    if (priceTimerRef.current) clearTimeout(priceTimerRef.current);
    priceTimerRef.current = setTimeout(() => {
      updateParams(key, value);
    }, 500);
  };

  const filterContent = (
    <div>
      {brands.length > 0 && (
        <FilterSection title="Brand">
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {brands.map((brand) => (
              <FilterCheckbox
                key={brand.id}
                label={brand.name}
                checked={brandFilter === brand.slug}
                onChange={() => updateParams("brand", brandFilter === brand.slug ? "" : brand.slug)}
                count={brand._count.products}
              />
            ))}
          </div>
        </FilterSection>
      )}

      <FilterSection title="Price Range">
        <div className="flex items-center gap-2">
          <Input
            placeholder="Min"
            type="number"
            value={localMinPrice}
            onChange={(e) => handlePriceChange("minPrice", e.target.value)}
            className="text-sm"
          />
          <span className="text-gray-400">-</span>
          <Input
            placeholder="Max"
            type="number"
            value={localMaxPrice}
            onChange={(e) => handlePriceChange("maxPrice", e.target.value)}
            className="text-sm"
          />
        </div>
      </FilterSection>

      <FilterSection title="Storage">
        <div className="space-y-1">
          {storageOptions.map((opt) => (
            <FilterCheckbox
              key={opt}
              label={opt}
              checked={storageFilter === opt}
              onChange={() => updateParams("storage", storageFilter === opt ? "" : opt)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="RAM">
        <div className="space-y-1">
          {ramOptions.map((opt) => (
            <FilterCheckbox
              key={opt}
              label={opt}
              checked={ramFilter === opt}
              onChange={() => updateParams("ram", ramFilter === opt ? "" : opt)}
            />
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Condition">
        <div className="space-y-1">
          {conditionOptions.map((opt) => (
            <FilterCheckbox
              key={opt}
              label={opt}
              checked={conditionFilter === opt}
              onChange={() => updateParams("condition", conditionFilter === opt ? "" : opt)}
            />
          ))}
        </div>
      </FilterSection>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {categoryFilter ? categoryFilter.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "All Mobile Phones"}
          </h1>
          <p className="text-gray-500">
            {loading ? "Loading..." : `${total} products found`}
          </p>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {activeFilters.map((f) => (
              <Badge key={f.key} variant="info" size="md" className="gap-1 pr-1.5">
                {f.label}
                <button
                  onClick={() => updateParams(f.key, "")}
                  className="ml-1 p-0.5 rounded-full hover:bg-blue-200/50 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <button
              onClick={clearAllFilters}
              className="text-sm text-brand-blue hover:underline cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <Card className="p-5 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Filters</h2>
                {activeFilters.length > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-brand-blue hover:underline cursor-pointer">
                    Reset
                  </button>
                )}
              </div>
              {filterContent}
            </Card>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Sort bar */}
            <div className="flex items-center justify-between mb-6 gap-4">
              <button
                onClick={() => setMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                <Filter className="h-4 w-4" /> Filters
                {activeFilters.length > 0 && (
                  <Badge variant="info" size="sm">{activeFilters.length}</Badge>
                )}
              </button>
              <div className="flex-1" />
              <Select
                options={sortOptions}
                value={sort}
                onChange={(v) => updateParams("sort", v)}
                placeholder="Sort by"
              />
            </div>

            {/* Products grid */}
            {loading ? (
              <LoadingSkeleton variant="product-card" count={8} />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No products found"
                description="Try adjusting your filters or search criteria"
                actionLabel="Clear Filters"
                onAction={clearAllFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                <div className="mt-8">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("page", String(p));
                      router.push(`/phones?${params.toString()}`);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileFiltersOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-gray-900">Filters</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              {filterContent}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Show {total} Results
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PhonesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2563eb]" /></div>}>
      <PhonesPageContent />
    </Suspense>
  );
}
