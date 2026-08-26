"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  MapPin,
  Truck,
  CreditCard,
  Package,
  ArrowRight,
  ArrowLeft,
  ShoppingCart,
  Shield,
} from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useCartStore } from "@/stores/cart-store";
import { useToast } from "@/components/ui/toast";

const STEPS = ["Address", "Delivery", "Review", "Payment", "Confirm"];

const deliveryOptions = [
  { value: "standard", label: "Standard Delivery", description: "Free delivery in 5-7 business days", price: 0 },
  { value: "express", label: "Express Delivery", description: "Delivery in 1-2 business days", price: 149 },
];

const paymentMethods = [
  { value: "cod", label: "Cash on Delivery", description: "Pay when you receive", available: true },
  { value: "upi", label: "UPI", description: "PhonePe, Google Pay, Paytm", available: false },
  { value: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, RuPay", available: false },
  { value: "netbanking", label: "Net Banking", description: "All major banks", available: false },
];

interface SiteSettings {
  taxRate: number;
  freeShippingThreshold: number;
  expressShippingPrice: number;
  standardShippingPrice: number;
}

const defaultSettings: SiteSettings = {
  taxRate: 0.18,
  freeShippingThreshold: 999,
  expressShippingPrice: 149,
  standardShippingPrice: 99,
};

export default function CheckoutPage() {
  const toast = useToast();
  const { items, clearCart } = useCartStore();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");
  const [address, setAddress] = useState({
    name: "", phone: "", addressLine1: "", addressLine2: "", city: "", state: "", pincode: "",
  });
  const [delivery, setDelivery] = useState("standard");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const map: Record<string, string> = {};
          for (const s of data.settings) map[s.key] = s.value;
          setSettings({
            taxRate: parseFloat(map.tax_rate || "0.18") || 0.18,
            freeShippingThreshold: parseInt(map.free_shipping_threshold || "999") || 999,
            expressShippingPrice: parseInt(map.express_shipping_price || "149") || 149,
            standardShippingPrice: parseInt(map.standard_shipping_price || "99") || 99,
          });
        }
      })
      .catch(() => {});
  }, []);

  const subtotal = items.reduce((sum, item) => sum + (item.discountPrice || item.price) * item.quantity, 0);
  const deliveryCharge = delivery === "express"
    ? settings.expressShippingPrice
    : (subtotal >= settings.freeShippingThreshold ? 0 : settings.standardShippingPrice);
  const tax = Math.round(subtotal * settings.taxRate * 100) / 100;
  const total = subtotal + deliveryCharge + tax;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: {
            name: address.name,
            phone: address.phone,
            addressLine1: address.addressLine1,
            addressLine2: address.addressLine2 || null,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          paymentMethod,
          notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrderNumber(data.order.orderNumber);
        clearCart();
        setStep(4);
        toast.success("Order placed successfully!");
      } else {
        toast.error(data.error || "Failed to place order");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, 4));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  if (items.length === 0 && step < 4) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="mx-auto max-w-lg px-4 text-center">
          <ShoppingCart className="mx-auto h-12 w-12 text-gray-300" />
          <h2 className="mt-4 text-lg font-semibold text-gray-900">Your cart is empty</h2>
          <Link href="/" className="mt-4 inline-block">
            <Button>Continue Shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Checkout</h1>

        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                    i < step ? "bg-emerald-500 text-white"
                    : i === step ? "bg-[#2563eb] text-white ring-4 ring-[#2563eb]/20"
                    : "bg-gray-200 text-gray-500"
                  }`}>
                    {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-gray-500 hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1 h-0.5 w-6 sm:w-12 ${i < step ? "bg-emerald-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                {step === 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <MapPin className="h-5 w-5 text-[#2563eb]" /> Delivery Address
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input label="Full Name" required placeholder="John Doe" value={address.name} onChange={(e) => setAddress({ ...address, name: e.target.value })} />
                      <Input label="Phone" required placeholder="+91 98765 43210" value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
                    </div>
                    <div className="mt-4">
                      <Input label="Address Line 1" required placeholder="House/Flat, Street" value={address.addressLine1} onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })} />
                    </div>
                    <div className="mt-4">
                      <Input label="Address Line 2" placeholder="Landmark, Area" value={address.addressLine2} onChange={(e) => setAddress({ ...address, addressLine2: e.target.value })} />
                    </div>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <Input label="City" required placeholder="Mumbai" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                      <Input label="State" required placeholder="Maharashtra" value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
                      <Input label="Pincode" required placeholder="400001" value={address.pincode} onChange={(e) => setAddress({ ...address, pincode: e.target.value })} />
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <Truck className="h-5 w-5 text-[#2563eb]" /> Delivery Method
                    </h2>
                    <div className="space-y-3">
                      {deliveryOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => setDelivery(opt.value)}
                          className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all ${
                            delivery === opt.value ? "border-[#2563eb] bg-[#2563eb]/5" : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                            <p className="text-xs text-gray-500">{opt.description}</p>
                          </div>
                          <span className={`text-sm font-bold ${opt.price === 0 ? "text-emerald-600" : "text-gray-900"}`}>
                            {opt.price === 0 ? "FREE" : `₹${opt.price}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <Package className="h-5 w-5 text-[#2563eb]" /> Order Review
                    </h2>
                    <div className="space-y-3">
                      {items.map((item) => (
                        <div key={item.variantId} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-gray-200 flex items-center justify-center">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold">₹{((item.discountPrice || item.price) * item.quantity).toLocaleString("en-IN")}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 rounded-lg bg-gray-50 p-4">
                      <p className="text-xs text-gray-500">Delivering to</p>
                      <p className="text-sm font-medium text-gray-900">{address.name}, {address.addressLine1}, {address.city}, {address.state} - {address.pincode}</p>
                    </div>
                    <div className="mt-3">
                      <Textarea label="Order Notes (Optional)" placeholder="Any special instructions..." value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <CreditCard className="h-5 w-5 text-[#2563eb]" /> Payment Method
                    </h2>
                    <div className="space-y-3">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.value}
                          onClick={() => method.available && setPaymentMethod(method.value)}
                          disabled={!method.available}
                          className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            paymentMethod === method.value && method.available
                              ? "border-[#2563eb] bg-[#2563eb]/5"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{method.label}</p>
                            <p className="text-xs text-gray-500">{method.description}</p>
                          </div>
                          {!method.available && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-600">
                              Coming Soon
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3">
                      <Shield className="h-4 w-4 text-[#2563eb]" />
                      <p className="text-xs text-gray-600">All online payments will be secured with 256-bit encryption. Integration coming soon.</p>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Order Placed!</h2>
                    <p className="mt-2 text-gray-500">
                      Order number: <span className="font-semibold text-[#2563eb]">{orderNumber}</span>
                    </p>
                    <p className="mt-4 text-sm text-gray-400">
                      Thank you for shopping with OM Cellular. We&apos;ll send you an update once your order ships.
                    </p>
                    <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <Link href="/account/orders">
                        <Button>View My Orders</Button>
                      </Link>
                      <Link href="/">
                        <Button variant="outline">Continue Shopping</Button>
                      </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {step < 4 && (
              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" onClick={prev} disabled={step === 0}>
                  <ArrowLeft className="h-4 w-4" /> Back
                </Button>
                {step === 3 ? (
                  <Button onClick={handlePlaceOrder} loading={submitting}>
                    Place Order - ₹{total.toLocaleString("en-IN")}
                  </Button>
                ) : (
                  <Button onClick={next}>
                    Continue <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Summary sidebar */}
          {step < 4 && (
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal ({items.length} items)</span>
                    <span>₹{subtotal.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Delivery</span>
                    <span className={deliveryCharge === 0 ? "text-emerald-600 font-medium" : ""}>
                      {deliveryCharge === 0 ? "FREE" : `₹${deliveryCharge}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax (GST)</span>
                    <span>₹{tax.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="border-t border-gray-100 pt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-gray-900">₹{total.toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
