"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock, Circle, Package } from "lucide-react";
import Button from "@/components/ui/button";
import Card from "@/components/ui/card";
import StatusBadge from "@/components/ui/status-badge";

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    total: number;
    variant: { name: string; sku: string; color: string | null; storage: string | null };
  }>;
  address: {
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    pincode: string;
  } | null;
}

const ORDER_STATUSES = [
  { key: "PENDING", label: "Order Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PROCESSING", label: "Processing" },
  { key: "SHIPPED", label: "Shipped" },
  { key: "OUT_FOR_DELIVERY", label: "Out for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export default function OrderDetailPage() {
  const params = useParams();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetch(`/api/orders/${params.id}`)
        .then((r) => r.json())
        .then((d) => { setOrder(d.order || d); setLoading(false); })
        .catch(() => setLoading(false));
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
          <p className="mt-4 text-sm text-gray-400">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Order not found</h2>
          <Link href="/account" className="mt-4 inline-block">
            <Button>Back to Account</Button>
          </Link>
        </div>
      </div>
    );
  }

  const currentIdx = ORDER_STATUSES.findIndex((s) => s.key === order.status);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#2563eb]">
          <ArrowLeft className="h-4 w-4" /> Back to Account
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
            <p className="text-sm text-gray-500">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Timeline */}
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Order Status</h2>
          <div className="flex items-center justify-between">
            {ORDER_STATUSES.map((status, i) => (
              <div key={status.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                    i <= currentIdx ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"
                  }`}>
                    {i <= currentIdx ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-3 w-3" />}
                  </div>
                  <span className="mt-1 text-[10px] font-medium text-gray-500 hidden sm:block">{status.label}</span>
                </div>
                {i < ORDER_STATUSES.length - 1 && (
                  <div className={`mx-0.5 h-0.5 w-4 sm:w-10 ${i < currentIdx ? "bg-emerald-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">Items</h2>
          <div className="space-y-3">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                    <Package className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.variant.name}</p>
                    <p className="text-xs text-gray-500">
                      Qty: {item.quantity}
                      {item.variant.storage && ` &middot; ${item.variant.storage}`}
                      {item.variant.color && ` &middot; ${item.variant.color}`}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold">₹{item.total.toLocaleString("en-IN")}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Payment */}
          <Card>
            <h2 className="mb-3 text-sm font-semibold text-gray-900">Payment</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{order.subtotal.toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>{order.shipping === 0 ? "FREE" : `₹${order.shipping}`}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>₹{order.tax.toLocaleString("en-IN")}</span></div>
              <div className="border-t border-gray-100 pt-2"><div className="flex justify-between"><span className="font-semibold">Total</span><span className="font-bold">₹{order.total.toLocaleString("en-IN")}</span></div></div>
            </div>
            <div className="mt-3 text-xs text-gray-400">
              {order.paymentMethod ? `Method: ${order.paymentMethod}` : "Payment method: COD"} &middot; Status: {order.paymentStatus}
            </div>
          </Card>

          {/* Address */}
          {order.address && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Shipping Address</h2>
              <div className="text-sm text-gray-600">
                <p className="font-medium">{order.address.name}</p>
                <p>{order.address.addressLine1}</p>
                {order.address.addressLine2 && <p>{order.address.addressLine2}</p>}
                <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
                <p className="mt-1 text-gray-500">{order.address.phone}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
