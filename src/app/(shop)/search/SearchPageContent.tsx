"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  X,
  Clock,
  ArrowRight,
  SlidersHorizontal,
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
const RECENT_KEY = "om_recent_searches";

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
  condition: string | null;
  brand: { name: string; slug: string } | null;
  category: { name: string; slug: string } | null;
  variants: ProductVariant[];
}

const sortOptions = [
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function ProductResult({ product }: { product: Product }) {
  const variant = product.variants[0];
  if (!variant) return null;

  const images: string[] = (() => {
    try { return JSON.parse(variant.images); } catch { return []; }
  })();
  const price = variant.discountPrice || variant.price;

  return (
    <Link href={`/phones/${product.brand?.slug || "unknown"}/${product.slug}`}>
      <Card hover className="flex gap-4 p-4 group">
        <div className="relative w-24 h-24 bg-gray-50 rounded-xl overflow-hidden shrink-0">
          <Image
            src={images[0] || "/placeholder-product.png"}
            alt={product.name}
            fill
            className="object-contain p-2"
            sizes="96px"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              {product.brand && <p className="text-xs text-gray-500">{product.brand.name}</p>}
              <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#2563eb] transition-colors line-clamp-2">
                {product.name}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-lg font-bold text-gray-900">{price.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</span>
            {variant.discountPrice && variant.discountPrice < variant.price && (
              <span className="text-sm text-gray-400 line-through">{variant.price.toLocaleString("en-IN", { style: "currency", currency: "INR" })}</span>
            )}
          </div>
          {variant.storage && variant.ram && (
            <p className="text-xs text-gray-500 mt-1">{variant.storage} / {variant.ram}</p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const query = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const sort = searchParams.get("sort") || "newest";

  const [searchInput, setSearchInput] = useState(query);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentSearches(JSON.parse(stored));
    } catch {}
  }, []);

  const saveRecent = useCallback((term: string) => {
    if (!term.trim()) return;
    setRecentSearches((prev) => {
      const updated = [term, ...prev.filter((s) => s !== term)].slice(0, 8);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const doSearch = useCallback(
    (term: string, p: number = 1, s: string = sort) => {
      if (!term.trim()) return;
      saveRecent(term.trim());
      const params = new URLSearchParams();
      params.set("q", term.trim());
      params.set("page", String(p));
      params.set("sort", s);
      router.push(`/search?${params.toString()}`);
    },
    [router, sort, saveRecent]
  );

  useEffect(() => {
    if (!query) {
      setProducts([]);
      setTotal(0);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: query,
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
    };

    fetchResults();
  }, [query, page, sort]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doSearch(searchInput, 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-8">
          <form onSubmit={handleSubmit} className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search phones, accessories, services..."
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 bg-white text-lg text-gray-900 outline-none shadow-sm focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] transition-all"
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => { setSearchInput(""); inputRef.current?.focus(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 cursor-pointer"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            )}
          </form>
        </div>

        {!query && (
          <div className="max-w-2xl">
            {recentSearches.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Recent Searches
                  </h2>
                  <button
                    onClick={() => { setRecentSearches([]); localStorage.removeItem(RECENT_KEY); }}
                    className="text-xs text-[#2563eb] hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => { setSearchInput(term); doSearch(term); }}
                      className="flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors cursor-pointer"
                    >
                      <Clock className="h-3.5 w-3.5 text-gray-400" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-4">Popular Searches</h2>
              <div className="flex flex-wrap gap-2">
                {["iPhone 15", "Samsung Galaxy", "Screen Repair", "Phone Cases", "Battery Replacement", "OnePlus"].map(
                  (term) => (
                    <button
                      key={term}
                      onClick={() => { setSearchInput(term); doSearch(term); }}
                      className="px-4 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700 hover:border-[#2563eb] hover:text-[#2563eb] transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {query && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Search results for &quot;{query}&quot;
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {loading ? "Searching..." : `${total} results found`}
                </p>
              </div>
              <Select
                options={sortOptions}
                value={sort}
                onChange={(v) => doSearch(query, 1, v as string)}
                placeholder="Sort by"
              />
            </div>

            {loading ? (
              <LoadingSkeleton variant="card" count={5} />
            ) : products.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No results found"
                description={`We couldn't find anything matching "${query}". Try different keywords or browse our categories.`}
                actionLabel="Browse Phones"
                onAction={() => router.push("/phones")}
              />
            ) : (
              <>
                <div className="space-y-3">
                  {products.map((product) => (
                    <ProductResult key={product.id} product={product} />
                  ))}
                </div>
                <div className="mt-8">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={(p) => doSearch(query, p)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
