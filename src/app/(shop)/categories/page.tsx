"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Smartphone,
  Headphones,
  Wrench,
  RotateCcw,
  Battery,
  Shield,
  Cable,
  Watch,
  Tablet,
  Camera,
} from "lucide-react";
import Card from "@/components/ui/card";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

const API_BASE = "";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  _count: { products: number };
}

const fallbackIcons: Record<string, React.ElementType> = {
  smartphones: Smartphone,
  accessories: Headphones,
  repair: Wrench,
  exchange: RotateCcw,
  battery: Battery,
  protection: Shield,
  cables: Cable,
  watches: Watch,
  tablets: Tablet,
  cameras: Camera,
};

const fallbackCategories: DisplayCategory[] = [
  { name: "Smartphones", slug: "smartphones", description: "Browse the latest smartphones from top brands", count: 0, id: "f1", image: null, icon: "smartphones" },
  { name: "Accessories", slug: "accessories", description: "Cases, chargers, earbuds, and more", count: 0, id: "f2", image: null, icon: "accessories" },
  { name: "Refurbished", slug: "refurbished", description: "Quality refurbished phones at great prices", count: 0, id: "f3", image: null, icon: "exchange" },
  { name: "Budget Phones", slug: "budget-phones", description: "Affordable phones under ₹10,000", count: 0, id: "f4", image: null, icon: "smartphones" },
  { name: "Flagship Phones", slug: "flagship-phones", description: "Premium flagship devices from top brands", count: 0, id: "f5", image: null, icon: "smartphones" },
  { name: "Gaming Phones", slug: "gaming-phones", description: "High-performance phones for gaming", count: 0, id: "f6", image: null, icon: "smartphones" },
];

interface DisplayCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  icon: string | null;
  count: number;
}

const categoryColors = [
  "from-blue-500 to-blue-600",
  "from-orange-500 to-orange-600",
  "from-emerald-500 to-emerald-600",
  "from-purple-500 to-purple-600",
  "from-pink-500 to-pink-600",
  "from-amber-500 to-amber-600",
  "from-cyan-500 to-cyan-600",
  "from-rose-500 to-rose-600",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`);
        if (res.ok) {
          const d = await res.json();
          setCategories(d.categories || []);
        }
      } catch {
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCategories();
  }, []);

  const displayCategories: DisplayCategory[] = categories.length > 0
    ? categories.map((c) => ({ ...c, count: c._count.products }))
    : fallbackCategories;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">All Categories</h1>
          <p className="text-gray-500">Browse our wide range of product categories</p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 animate-pulse">
                <div className="h-16 bg-gray-200 rounded-2xl w-16 mb-4" />
                <div className="h-5 bg-gray-200 rounded-full w-1/2 mb-2" />
                <div className="h-4 bg-gray-200 rounded-full w-3/4" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayCategories.map((cat, i) => {
              const IconComp = cat.icon
                ? fallbackIcons[cat.icon] || Smartphone
                : fallbackIcons[cat.slug] || Smartphone;
              const colorClass = categoryColors[i % categoryColors.length];

              return (
                <Link key={cat.id || cat.slug} href={`/phones?category=${cat.slug}`}>
                  <Card hover className="p-6 h-full group relative overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-br ${colorClass} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    <div className="relative">
                      {cat.image ? (
                        <div className="relative w-16 h-16 mb-4 overflow-hidden rounded-2xl">
                          <Image src={cat.image} alt={cat.name} fill className="object-cover" sizes="64px" />
                        </div>
                      ) : (
                        <div className={`flex items-center justify-center w-16 h-16 mb-4 rounded-2xl bg-gradient-to-br ${colorClass} text-white`}>
                          <IconComp className="h-8 w-8" />
                        </div>
                      )}
                      <h2 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-brand-blue transition-colors">
                        {cat.name}
                      </h2>
                      {cat.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{cat.description}</p>
                      )}
                      <span className="text-sm font-medium text-brand-blue">
                        {cat.count} {cat.count === 1 ? "product" : "products"} →
                      </span>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
