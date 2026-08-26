"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WishlistItem {
  variantId: string;
  productId: string;
  name: string;
  variant: string;
  price: number;
  discountPrice?: number;
  image: string;
}

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (variantId: string) => void;
  hasItem: (variantId: string) => boolean;
  itemCount: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          if (state.items.some((i) => i.variantId === item.variantId)) return state;
          return { items: [...state.items, item] };
        }),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      hasItem: (variantId) => get().items.some((i) => i.variantId === variantId),
      itemCount: () => get().items.length,
    }),
    { name: "om-wishlist" }
  )
);
