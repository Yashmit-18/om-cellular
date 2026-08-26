"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Heart,
  ShoppingCart,
  Share2,
  ChevronRight,
  Shield,
  RotateCcw,
  Truck,
  CheckCircle2,
  Star,
  Minus,
  Plus,
  Copy,
  MessageSquare,
  Info,
  Package,
  ClipboardList,
  CheckCheck,
} from "lucide-react";
import Button from "@/components/ui/button";
import Badge from "@/components/ui/badge";
import Card from "@/components/ui/card";
import Tabs from "@/components/ui/tabs";
import StarRating from "@/components/ui/star-rating";
import LoadingSkeleton from "@/components/ui/loading-skeleton";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { useToast } from "@/components/ui/toast";

const API_BASE = "";

interface Variant {
  id: string;
  name: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  ram: string | null;
  storage: string | null;
  color: string | null;
  condition: string | null;
  batteryHealth: number | null;
  images: string;
  specifications: string;
  whatsIncluded: string;
  isRefurbished: boolean;
  badge: string | null;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  condition: string | null;
  warranty: string | null;
  returnPolicy: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isRefurbished: boolean;
  brand: { id: string; name: string; slug: string } | null;
  category: { id: string; name: string; slug: string } | null;
  variants: Variant[];
}

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: { name: string | null; image: string | null };
}

interface RelatedProduct {
  id: string;
  name: string;
  slug: string;
  brand: { name: string; slug: string } | null;
  variants: { id: string; price: number; discountPrice: number | null; images: string; storage: string | null; ram: string | null; badge: string | null }[];
}

function ImageGallery({ images }: { images: string[] }) {
  const [active, setActive] = useState(0);
  const displayImages = images.length > 0 ? images : ["/placeholder-product.png"];

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
        <Image
          src={displayImages[active]}
          alt="Product"
          fill
          className="object-contain p-6"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {displayImages.length > 1 && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {displayImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 cursor-pointer transition-all ${
                i === active ? "border-brand-blue" : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <Image src={img} alt="" fill className="object-contain p-1" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RelatedProducts({ products, currentSlug }: { products: RelatedProduct[]; currentSlug: string }) {
  const filtered = products.filter((p) => p.slug !== currentSlug).slice(0, 4);
  if (filtered.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {filtered.map((product) => {
          const variant = product.variants[0];
          if (!variant) return null;
          const images: string[] = (() => {
            try { return JSON.parse(variant.images); } catch { return []; }
          })();
          const price = variant.discountPrice || variant.price;

          return (
            <Link key={product.id} href={`/phones/${product.brand?.slug || "unknown"}/${product.slug}`}>
              <Card hover className="overflow-hidden group">
                <div className="relative aspect-square bg-gray-50 overflow-hidden">
                  <Image
                    src={images[0] || "/placeholder-product.png"}
                    alt={product.name}
                    fill
                    className="object-contain p-3 transition-transform group-hover:scale-105"
                    sizes="25vw"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs text-gray-500">{product.brand?.name}</p>
                  <h3 className="text-sm font-medium text-gray-900 line-clamp-2 mt-1">{product.name}</h3>
                  <p className="text-sm font-bold text-gray-900 mt-2">₹{price.toLocaleString("en-IN")}</p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const brandSlug = params.brand as string;
  const productSlug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [wishlisted, setWishlisted] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/products?search=${productSlug}&limit=50`);
        if (res.ok) {
          const data = await res.json();
          const found = data.products?.find((p: Product) => p.slug === productSlug);
          if (found) {
            setProduct(found);
            const activeVariants = found.variants.filter((v: Variant) => v.stock > 0 || true);
            setSelectedVariant(activeVariants[0] || found.variants[0]);

            const relatedRes = await fetch(`${API_BASE}/api/products?limit=8${found.brand ? `&brand=${found.brand.slug}` : ""}`);
            if (relatedRes.ok) {
              const rd = await relatedRes.json();
              setRelatedProducts(rd.products || []);
            }

            if (activeVariants[0]?.id || found.variants[0]?.id) {
              const reviewRes = await fetch(`${API_BASE}/api/reviews?variantId=${activeVariants[0]?.id || found.variants[0]?.id}`);
              if (reviewRes.ok) {
                const rv = await reviewRes.json();
                setReviews(rv.reviews || []);
              }
            }
          }
        }
      } catch {
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productSlug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 py-8">
          <LoadingSkeleton variant="text" count={2} className="max-w-md mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <LoadingSkeleton variant="card" />
            <div className="space-y-4">
              <LoadingSkeleton variant="text" count={5} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h1>
          <p className="text-gray-500 mb-4">The product you are looking for does not exist.</p>
          <Button onClick={() => router.push("/phones")}>Browse Phones</Button>
        </div>
      </div>
    );
  }

  const v = selectedVariant || product.variants[0];
  const images: string[] = v ? (() => {
    try { return JSON.parse(v.images); } catch { return []; }
  })() : [];

  const specifications: { key: string; value: string }[] = v ? (() => {
    try { return JSON.parse(v.specifications); } catch { return []; }
  })() : [];

  const whatsIncluded: string[] = v ? (() => {
    try { return JSON.parse(v.whatsIncluded); } catch { return []; }
  })() : [];

  const price = v?.discountPrice || v?.price || 0;
  const hasDiscount = v?.discountPrice && v.discountPrice < (v?.price || 0);
  const discountPct = hasDiscount ? Math.round(((v!.price - v!.discountPrice!) / v!.price) * 100) : 0;

  const uniqueStorage = [...new Set(product.variants.map((v) => v.storage).filter(Boolean))] as string[];
  const uniqueRam = [...new Set(product.variants.map((v) => v.ram).filter(Boolean))] as string[];
  const uniqueColor = [...new Set(product.variants.map((v) => v.color).filter(Boolean))] as string[];

  const handleAddToCart = () => {
    toast.success("Added to cart!");
  };

  const handleBuyNow = () => {
    toast.info("Proceeding to checkout...");
  };

  const handleWishlist = () => {
    setWishlisted(!wishlisted);
    toast.success(wishlisted ? "Removed from wishlist" : "Added to wishlist!");
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  const avgRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <Breadcrumbs />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Images */}
          <ImageGallery images={images} />

          {/* Right: Info */}
          <div>
            {product.brand && (
              <Link href={`/phones/${product.brand.slug}`} className="text-sm text-brand-blue hover:underline">
                {product.brand.name}
              </Link>
            )}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 mb-3">{product.name}</h1>

            <div className="flex items-center gap-3 mb-4">
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <StarRating rating={avgRating} size="sm" />
                  <span className="text-sm text-gray-600">{avgRating.toFixed(1)} ({reviews.length} reviews)</span>
                </div>
              )}
              {v?.badge && <Badge variant="warning" size="sm">{v.badge}</Badge>}
              {product.condition && (
                <Badge variant={product.condition === "New" ? "success" : "info"} size="sm">
                  {product.condition}
                </Badge>
              )}
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <div className="flex items-baseline gap-3 mb-1">
                <span className="text-3xl font-bold text-gray-900">₹{price.toLocaleString("en-IN")}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">₹{v!.price.toLocaleString("en-IN")}</span>
                    <Badge variant="danger" size="md">{discountPct}% OFF</Badge>
                  </>
                )}
              </div>
              <p className="text-sm text-gray-500">Inclusive of all taxes. EMI starts at ₹{(price / 12).toFixed(0)}/month.</p>
            </div>

            {/* Variant selectors */}
            {uniqueStorage.length > 1 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Storage: <span className="text-brand-blue">{v?.storage || "N/A"}</span></p>
                <div className="flex flex-wrap gap-2">
                  {uniqueStorage.map((s) => {
                    const matchVariant = product.variants.find((vv) => vv.storage === s);
                    return (
                      <button
                        key={s}
                        onClick={() => {
                          if (matchVariant) setSelectedVariant(matchVariant);
                          setQuantity(1);
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                          v?.storage === s
                            ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {uniqueRam.length > 1 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">RAM: <span className="text-brand-blue">{v?.ram || "N/A"}</span></p>
                <div className="flex flex-wrap gap-2">
                  {uniqueRam.map((r) => {
                    const matchVariant = product.variants.find((vv) => vv.ram === r);
                    return (
                      <button
                        key={r}
                        onClick={() => {
                          if (matchVariant) setSelectedVariant(matchVariant);
                          setQuantity(1);
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                          v?.ram === r
                            ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {uniqueColor.length > 1 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-900 mb-2">Color: <span className="text-brand-blue">{v?.color || "N/A"}</span></p>
                <div className="flex flex-wrap gap-2">
                  {uniqueColor.map((c) => {
                    const matchVariant = product.variants.find((vv) => vv.color === c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          if (matchVariant) setSelectedVariant(matchVariant);
                          setQuantity(1);
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm font-medium cursor-pointer transition-all ${
                          v?.color === c
                            ? "border-brand-blue bg-brand-blue/5 text-brand-blue"
                            : "border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stock status */}
            <div className="flex items-center gap-2 mb-6">
              {v && v.stock > 0 ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-medium">In Stock ({v.stock} available)</span>
                </>
              ) : (
                <span className="text-sm text-red-500 font-medium">Out of Stock</span>
              )}
            </div>

            {/* Quantity + Actions */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="p-2.5 text-gray-600 hover:bg-gray-50 cursor-pointer"
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="px-4 py-2 text-sm font-medium min-w-[40px] text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(v?.stock || 10, quantity + 1))}
                  className="p-2.5 text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Button
                variant="primary"
                size="lg"
                className="flex-1"
                onClick={handleAddToCart}
                disabled={!v || v.stock <= 0}
              >
                <ShoppingCart className="h-5 w-5" /> Add to Cart
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={handleBuyNow}
                disabled={!v || v.stock <= 0}
              >
                Buy Now
              </Button>
            </div>

            <div className="flex items-center gap-3 mb-6">
              <Button variant="ghost" size="sm" onClick={handleWishlist}>
                <Heart className={`h-4 w-4 ${wishlisted ? "fill-red-500 text-red-500" : ""}`} />
                {wishlisted ? "Wishlisted" : "Wishlist"}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4" /> Share
              </Button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <Shield className="h-5 w-5 text-brand-blue mb-1" />
                <span className="text-xs font-medium text-gray-700">{product.warranty || "6 Months Warranty"}</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <RotateCcw className="h-5 w-5 text-brand-blue mb-1" />
                <span className="text-xs font-medium text-gray-700">{product.returnPolicy || "7-Day Returns"}</span>
              </div>
              <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-xl">
                <Truck className="h-5 w-5 text-brand-blue mb-1" />
                <span className="text-xs font-medium text-gray-700">Free Delivery</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs section */}
        <div className="mt-12">
          <Tabs defaultTab="description">
            <Tabs.List>
              <Tabs.Trigger id="description">Description</Tabs.Trigger>
              <Tabs.Trigger id="specifications">Specifications</Tabs.Trigger>
              <Tabs.Trigger id="whats-included">What&apos;s Included</Tabs.Trigger>
              <Tabs.Trigger id="reviews">
                Reviews {reviews.length > 0 && `(${reviews.length})`}
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Panel id="description">
              <Card className="p-6">
                <div className="prose prose-sm max-w-none text-gray-700">
                  {product.description ? (
                    <div dangerouslySetInnerHTML={{ __html: product.description }} />
                  ) : (
                    <p>No description available for this product.</p>
                  )}
                </div>
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="specifications">
              <Card className="p-6">
                {specifications.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {specifications.map((spec, i) => (
                      <div key={i} className="flex py-3 gap-4">
                        <span className="text-sm text-gray-500 w-40 shrink-0">{spec.key}</span>
                        <span className="text-sm text-gray-900 font-medium">{spec.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">No specifications available.</p>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="whats-included">
              <Card className="p-6">
                {whatsIncluded.length > 0 ? (
                  <ul className="space-y-2">
                    {whatsIncluded.map((item, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                        <CheckCheck className="h-4 w-4 text-emerald-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 text-sm">No information available.</p>
                )}
              </Card>
            </Tabs.Panel>

            <Tabs.Panel id="reviews">
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <Card key={review.id} className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-blue/10 text-brand-blue font-bold text-sm shrink-0">
                          {review.user?.name?.charAt(0) || "U"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900 text-sm">{review.user?.name || "Anonymous"}</span>
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                          {review.title && <p className="font-medium text-gray-900 text-sm mb-1">{review.title}</p>}
                          {review.comment && <p className="text-sm text-gray-600">{review.comment}</p>}
                          <p className="text-xs text-gray-400 mt-2">
                            {new Date(review.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <Card className="p-8 text-center">
                    <MessageSquare className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No reviews yet. Be the first to review this product!</p>
                  </Card>
                )}
              </div>
            </Tabs.Panel>
          </Tabs>
        </div>

        {/* Refurbished device condition */}
        {product.isRefurbished && v && (
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Device Condition</h2>
            <Card className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Display", status: "Good" },
                  { label: "Battery", status: v.batteryHealth ? `${v.batteryHealth}% health` : "Good" },
                  { label: "Camera", status: "Working" },
                  { label: "Speaker", status: "Working" },
                  { label: "Body", status: "Minor scratches" },
                  { label: "Buttons", status: "Working" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <Badge variant="success" size="sm">{item.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Related products */}
        <RelatedProducts products={relatedProducts} currentSlug={productSlug} />
      </div>
    </div>
  );
}
