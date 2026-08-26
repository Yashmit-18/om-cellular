"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, Tag, Heart } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import EmptyState from "@/components/ui/empty-state";
import { useCartStore } from "@/stores/cart-store";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useToast } from "@/components/ui/toast";

export default function CartPage() {
  const toast = useToast();
  const { items, removeItem, updateQuantity } = useCartStore();
  const wishlistStore = useWishlistStore();
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState("");

  const subtotal = items.reduce((sum, item) => {
    const price = item.discountPrice || item.price;
    return sum + price * item.quantity;
  }, 0);

  const delivery = subtotal >= 999 ? 0 : 99;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const total = subtotal + delivery + tax - couponDiscount;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, cartTotal: subtotal, productIds: items.map((i) => i.productId) }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setCouponDiscount(data.discount);
        setCouponApplied(true);
        toast.success(`Coupon applied! You save ₹${data.discount}`);
      } else {
        setCouponError(data.error || "Invalid coupon");
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  };

  const handleSaveForLater = (item: typeof items[0]) => {
    wishlistStore.addItem({
      variantId: item.variantId,
      productId: item.productId,
      name: item.name,
      variant: item.variant,
      price: item.price,
      discountPrice: item.discountPrice,
      image: item.image,
    });
    removeItem(item.variantId);
    toast.success("Item moved to wishlist");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <EmptyState
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet."
          actionLabel="Start Shopping"
          onAction={() => (window.location.href = "/")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Shopping Cart ({items.length})</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div key={item.variantId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <div className="flex gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-50 sm:h-24 sm:w-24">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover rounded-lg" />
                    ) : (
                      <ShoppingCart className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{item.variant}</p>
                    <div className="mt-2 flex items-center gap-3">
                      {item.discountPrice && (
                        <span className="text-sm text-gray-400 line-through">₹{item.price.toLocaleString("en-IN")}</span>
                      )}
                      <span className="text-base font-bold text-gray-900">
                        ₹{(item.discountPrice || item.price).toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                      disabled={item.quantity >= item.stock}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleSaveForLater(item)}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#f97316]"
                    >
                      <Heart className="h-3.5 w-3.5" /> Save
                    </button>
                    <button
                      onClick={() => { removeItem(item.variantId); toast.success("Item removed"); }}
                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              {/* Coupon */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Tag className="h-4 w-4 text-[#f97316]" /> Apply Coupon
                </h3>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                    disabled={couponApplied}
                  />
                  <Button
                    size="sm"
                    onClick={handleApplyCoupon}
                    loading={couponLoading}
                    disabled={couponApplied}
                  >
                    {couponApplied ? "Applied" : "Apply"}
                  </Button>
                </div>
                {couponError && <p className="mt-1.5 text-xs text-red-500">{couponError}</p>}
                {couponApplied && <p className="mt-1.5 text-xs text-emerald-600">Coupon applied! You save ₹{couponDiscount}</p>}
              </div>

              {/* Order Summary */}
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Order Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery</span>
                    <span className={`font-medium ${delivery === 0 ? "text-emerald-600" : ""}`}>
                      {delivery === 0 ? "FREE" : `₹${delivery}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax (GST 18%)</span>
                    <span className="font-medium">₹{tax.toLocaleString("en-IN")}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Coupon Discount</span>
                      <span className="font-medium">-₹{couponDiscount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex justify-between">
                      <span className="text-base font-semibold text-gray-900">Total</span>
                      <span className="text-base font-bold text-gray-900">₹{total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
                <Link href="/checkout" className="mt-4 block">
                  <Button className="w-full" size="lg">
                    Proceed to Checkout <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                {subtotal < 999 && (
                  <p className="mt-3 text-center text-xs text-gray-400">
                    Add ₹{(999 - subtotal).toLocaleString("en-IN")} more for free delivery
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
