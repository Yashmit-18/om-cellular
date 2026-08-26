"use client";

import { ShoppingCart, Trash2, Heart } from "lucide-react";
import Button from "@/components/ui/button";
import EmptyState from "@/components/ui/empty-state";
import { useWishlistStore } from "@/stores/wishlist-store";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/components/ui/toast";

export default function WishlistPage() {
  const toast = useToast();
  const { items, removeItem } = useWishlistStore();
  const cartStore = useCartStore();

  const handleMoveToCart = (item: typeof items[0]) => {
    cartStore.addItem({
      variantId: item.variantId,
      productId: item.productId,
      name: item.name,
      variant: item.variant,
      price: item.price,
      discountPrice: item.discountPrice,
      image: item.image,
      stock: 10,
    });
    removeItem(item.variantId);
    toast.success("Moved to cart");
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <EmptyState
          icon={Heart}
          title="Your wishlist is empty"
          description="Save items you love to your wishlist for later."
          actionLabel="Explore Products"
          onAction={() => (window.location.href = "/")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">My Wishlist ({items.length})</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.variantId} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="flex h-48 items-center justify-center bg-gray-50">
                <ShoppingCart className="h-12 w-12 text-gray-300" />
              </div>
              <div className="p-4">
                <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{item.variant}</p>
                <div className="mt-2 flex items-center gap-2">
                  {item.discountPrice && (
                    <span className="text-xs text-gray-400 line-through">₹{item.price.toLocaleString("en-IN")}</span>
                  )}
                  <span className="text-base font-bold text-gray-900">
                    ₹{(item.discountPrice || item.price).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => handleMoveToCart(item)}>
                    Move to Cart
                  </Button>
                  <button
                    onClick={() => { removeItem(item.variantId); toast.success("Removed from wishlist"); }}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-300 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
