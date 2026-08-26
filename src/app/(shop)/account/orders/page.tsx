"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Package, ChevronRight, ArrowLeft } from "lucide-react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{ variant: { name: string }; quantity: number; total: number }>;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((data) => setOrders(data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm text-[#2563eb] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Account
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">My Orders</h1>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No orders yet</h3>
            <p className="mt-2 text-sm text-gray-500">Your orders will appear here after you make a purchase.</p>
            <Link href="/" className="mt-4 inline-block rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/account/orders/${order.id}`}>
                <div className="rounded-xl border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(order.createdAt).toLocaleDateString("en-IN")} &middot; {order.items.length} item(s)
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        {order.items.map((i) => i.variant.name).join(", ")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        order.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                        order.status === "CANCELLED" ? "bg-red-50 text-red-700" :
                        "bg-yellow-50 text-yellow-700"
                      }`}>
                        {order.status}
                      </span>
                      <p className="text-sm font-bold">₹{order.total.toLocaleString("en-IN")}</p>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
