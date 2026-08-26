"use client";

import { useState } from "react";
import { Search, CheckCircle2, Clock, Circle, Package } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Card from "@/components/ui/card";

const ORDER_STATUSES = [
  { key: "PENDING", label: "Order Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

interface OrderData {
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: Array<{ variant: { name: string }; quantity: number; total: number }>;
}

export default function TrackOrderPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`/api/orders?search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.orders && data.orders.length > 0) {
        setOrder(data.orders[0]);
      } else {
        setError("No order found with that number.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const currentIdx = order ? ORDER_STATUSES.findIndex((s) => s.key === order.status) : -1;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Track Your Order</h1>
          <p className="mt-1 text-gray-500">Enter your order number to check the status</p>
        </div>

        <div className="mb-8 flex gap-3">
          <Input
            placeholder="Enter Order Number (e.g., OMC-2026-123456)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            iconPrefix={<Search className="h-4 w-4" />}
          />
          <Button onClick={handleSearch} loading={loading}>Search</Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">{error}</div>
        )}

        {order && (
          <div className="space-y-6">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{order.orderNumber}</h2>
                  <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-IN")} &middot; {order.items.length} item(s)</p>
                </div>
                <p className="text-lg font-bold">₹{order.total.toLocaleString("en-IN")}</p>
              </div>
            </Card>

            <Card>
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Order Timeline</h3>
              <div className="relative">
                {ORDER_STATUSES.map((status, i) => {
                  const isCompleted = i <= currentIdx;
                  const isCurrent = i === currentIdx;

                  return (
                    <div key={status.key} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isCompleted ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"
                        }`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-4 w-4" />}
                        </div>
                        {i < ORDER_STATUSES.length - 1 && (
                          <div className={`mt-1 h-full w-0.5 ${isCompleted && i < currentIdx ? "bg-emerald-500" : "bg-gray-200"}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isCurrent ? "text-[#2563eb]" : isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                          {status.label}
                        </p>
                        {isCurrent && (
                          <span className="mt-1 inline-block rounded-full bg-[#2563eb]/10 px-2 py-0.5 text-xs font-medium text-[#2563eb]">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card>
              <h3 className="mb-3 text-sm font-semibold text-gray-900">Items</h3>
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-700">{item.variant.name}</span>
                    <span className="text-xs text-gray-400">x{item.quantity}</span>
                  </div>
                  <span className="text-sm font-medium">₹{item.total.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </Card>
          </div>
        )}

        {!order && !error && !loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-400">Enter your order number above to track</p>
          </div>
        )}
      </div>
    </div>
  );
}
