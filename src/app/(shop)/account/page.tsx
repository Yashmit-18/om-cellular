"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  Package,
  Wrench,
  IndianRupee,
  ArrowRightLeft,
  MapPin,
  Heart,
  Bell,
  ChevronRight,
  LogOut,
} from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Card from "@/components/ui/card";
import EmptyState from "@/components/ui/empty-state";
import StatusBadge from "@/components/ui/status-badge";

const sidebarLinks = [
  { id: "profile", label: "Profile", icon: User },
  { id: "orders", label: "My Orders", icon: Package },
  { id: "repairs", label: "Repair Bookings", icon: Wrench },
  { id: "sell", label: "Sell Requests", icon: IndianRupee },
  { id: "exchange", label: "Exchange Requests", icon: ArrowRightLeft },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: "", email: "", phone: "" });
  const [orders, setOrders] = useState<Array<{ id: string; orderNumber: string; status: string; total: number; createdAt: string; items: Array<{ variant: { name: string } }> }>>([]);
  const [repairs, setRepairs] = useState<Array<{ id: string; bookingNumber: string; brand: string; model: string; status: string; createdAt: string }>>([]);
  const [sellRequests, setSellRequests] = useState<Array<{ id: string; requestNumber: string; brand: string; model: string; status: string; estimatedPrice: number | null; createdAt: string }>>([]);
  const [exchangeRequests, setExchangeRequests] = useState<Array<{ id: string; requestNumber: string; oldBrand: string; oldModel: string; status: string; createdAt: string }>>([]);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/orders").then((r) => r.json()).catch(() => ({ orders: [] })),
      fetch("/api/repairs").then((r) => r.json()).catch(() => ({ repairs: [] })),
      fetch("/api/sell-requests").then((r) => r.json()).catch(() => ({ requests: [] })),
      fetch("/api/exchange-requests").then((r) => r.json()).catch(() => ({ requests: [] })),
      fetch("/api/notifications").then((r) => r.json()).catch(() => ({ notifications: [] })),
    ]).then(([ordersData, repairsData, sellData, exchangeData, notifData]) => {
      setOrders(ordersData.orders || []);
      setRepairs(repairsData.repairs || []);
      setSellRequests(sellData.requests || []);
      setExchangeRequests(exchangeData.requests || []);
      setNotifications(notifData.notifications || []);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">My Account</h1>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card padding="none" className="overflow-hidden">
              {sidebarLinks.map((link) => (
                <button
                  key={link.id}
                  onClick={() => setActiveTab(link.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                    activeTab === link.id
                      ? "bg-[#2563eb]/5 text-[#2563eb] border-r-2 border-[#2563eb]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                  {link.id === "orders" && orders.length > 0 && (
                    <span className="ml-auto rounded-full bg-[#2563eb]/10 px-2 py-0.5 text-xs text-[#2563eb]">{orders.length}</span>
                  )}
                </button>
              ))}
              <div className="border-t border-gray-100">
                <Link href="/wishlist" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50">
                  <Heart className="h-4 w-4" /> Wishlist
                </Link>
                <button className="flex w-full items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {loading ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
                <p className="mt-4 text-sm text-gray-400">Loading...</p>
              </div>
            ) : (
              <>
                {activeTab === "profile" && (
                  <Card>
                    <h2 className="mb-6 text-lg font-semibold text-gray-900">Profile Information</h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Name" placeholder="John Doe" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                      <Input label="Email" type="email" placeholder="john@example.com" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
                      <Input label="Phone" placeholder="+91 98765 43210" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
                    </div>
                    <div className="mt-6">
                      <Button>Save Changes</Button>
                    </div>
                  </Card>
                )}

                {activeTab === "orders" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">My Orders</h2>
                    {orders.length === 0 ? (
                      <EmptyState icon={Package} title="No orders yet" description="Start shopping to see your orders here." actionLabel="Shop Now" onAction={() => (window.location.href = "/")} />
                    ) : orders.map((order) => (
                      <Link key={order.id} href={`/account/orders/${order.id}`}>
                        <Card hover>
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{order.orderNumber}</p>
                              <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString("en-IN")} &middot; {order.items.length} item(s)</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <StatusBadge status={order.status} />
                              <p className="text-sm font-bold">₹{order.total.toLocaleString("en-IN")}</p>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}

                {activeTab === "repairs" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Repair Bookings</h2>
                    {repairs.length === 0 ? (
                      <EmptyState icon={Wrench} title="No repair bookings" description="Book a repair to see it here." actionLabel="Book Repair" onAction={() => (window.location.href = "/repair/book")} />
                    ) : repairs.map((r) => (
                      <Card key={r.id}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.bookingNumber}</p>
                            <p className="text-xs text-gray-500">{r.brand} {r.model} &middot; {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {activeTab === "sell" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Sell Requests</h2>
                    {sellRequests.length === 0 ? (
                      <EmptyState icon={IndianRupee} title="No sell requests" description="Sell your old phone to see requests here." actionLabel="Sell Phone" onAction={() => (window.location.href = "/sell-phone")} />
                    ) : sellRequests.map((r) => (
                      <Card key={r.id}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.requestNumber}</p>
                            <p className="text-xs text-gray-500">{r.brand} {r.model} &middot; {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {r.estimatedPrice && <p className="text-sm font-bold text-[#f97316]">₹{r.estimatedPrice.toLocaleString("en-IN")}</p>}
                            <StatusBadge status={r.status} />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {activeTab === "exchange" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Exchange Requests</h2>
                    {exchangeRequests.length === 0 ? (
                      <EmptyState icon={ArrowRightLeft} title="No exchange requests" description="Exchange your old phone to see requests here." actionLabel="Exchange Phone" onAction={() => (window.location.href = "/exchange")} />
                    ) : exchangeRequests.map((r) => (
                      <Card key={r.id}>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{r.requestNumber}</p>
                            <p className="text-xs text-gray-500">{r.oldBrand} {r.oldModel} &middot; {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                          </div>
                          <StatusBadge status={r.status} />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {activeTab === "addresses" && (
                  <Card>
                    <h2 className="mb-6 text-lg font-semibold text-gray-900">Saved Addresses</h2>
                    <EmptyState icon={MapPin} title="No saved addresses" description="Add a new address for faster checkout." actionLabel="Add Address" onAction={() => {}} />
                  </Card>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                    {notifications.length === 0 ? (
                      <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
                    ) : notifications.map((n) => (
                      <Card key={n.id} className={!n.isRead ? "border-l-4 border-l-[#2563eb]" : ""}>
                        <p className="text-sm font-semibold text-gray-900">{n.title}</p>
                        <p className="mt-1 text-sm text-gray-500">{n.message}</p>
                        <p className="mt-2 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString("en-IN")}</p>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
