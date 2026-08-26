"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRightLeft,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Smartphone,
  Shield,
  Clock,
  Package,
} from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

const brands = [
  { value: "apple", label: "Apple" },
  { value: "samsung", label: "Samsung" },
  { value: "oneplus", label: "OnePlus" },
  { value: "xiaomi", label: "Xiaomi" },
  { value: "realme", label: "Realme" },
  { value: "vivo", label: "Vivo" },
  { value: "oppo", label: "Oppo" },
];

const modelsByBrand: Record<string, { value: string; label: string }[]> = {
  apple: [
    { value: "iphone-15-pro-max", label: "iPhone 15 Pro Max" },
    { value: "iphone-15-pro", label: "iPhone 15 Pro" },
    { value: "iphone-14", label: "iPhone 14" },
    { value: "iphone-13", label: "iPhone 13" },
  ],
  samsung: [
    { value: "galaxy-s24-ultra", label: "Galaxy S24 Ultra" },
    { value: "galaxy-s23", label: "Galaxy S23" },
    { value: "galaxy-a55", label: "Galaxy A55" },
  ],
  oneplus: [
    { value: "oneplus-12", label: "OnePlus 12" },
    { value: "oneplus-11", label: "OnePlus 11" },
  ],
  xiaomi: [
    { value: "xiaomi-14", label: "Xiaomi 14" },
    { value: "redmi-note-13-pro", label: "Redmi Note 13 Pro" },
  ],
  realme: [
    { value: "realme-gt-5-pro", label: "Realme GT 5 Pro" },
    { value: "realme-12-pro-plus", label: "Realme 12 Pro+" },
  ],
  vivo: [
    { value: "vivo-x100-pro", label: "Vivo X100 Pro" },
    { value: "vivo-v30", label: "Vivo V30" },
  ],
  oppo: [
    { value: "oppo-find-x7", label: "OPPO Find X7" },
    { value: "oppo-reno-11", label: "OPPO Reno 11" },
  ],
};

const conditionOptions = [
  { value: "perfect", label: "Perfect" },
  { value: "minor-scratches", label: "Minor Scratches" },
  { value: "cracked", label: "Cracked" },
  { value: "not-working", label: "Not Working" },
];

const batteryOptions = [
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "average", label: "Average" },
  { value: "poor", label: "Poor" },
];

const ageOptions = [
  { value: "less-6", label: "Less than 6 months" },
  { value: "6-12", label: "6 - 12 months" },
  { value: "1-2", label: "1 - 2 years" },
  { value: "2-3", label: "2 - 3 years" },
  { value: "3-plus", label: "3+ years" },
];

const STEPS = ["Your Device", "Condition", "Estimate", "Choose New", "Difference", "Details", "Done"];

function fallbackEstimateExchange(data: Record<string, string>): number {
  let base = 12000;
  if (data.brand === "apple") base = 30000;
  else if (data.brand === "samsung") base = 22000;
  else if (data.brand === "oneplus") base = 18000;

  if (data.age === "less-6") base *= 0.85;
  else if (data.age === "6-12") base *= 0.7;
  else if (data.age === "1-2") base *= 0.55;
  else if (data.age === "2-3") base *= 0.4;
  else base *= 0.25;

  if (data.displayCondition === "perfect") base *= 1;
  else if (data.displayCondition === "minor-scratches") base *= 0.85;
  else if (data.displayCondition === "cracked") base *= 0.55;
  else base *= 0.2;

  if (data.batteryCondition === "excellent") base *= 1;
  else if (data.batteryCondition === "good") base *= 0.92;
  else if (data.batteryCondition === "average") base *= 0.82;
  else base *= 0.7;

  return Math.round(base / 100) * 100;
}

async function fetchServerExchangeEstimate(data: Record<string, string>): Promise<number | null> {
  const brandLabel = brands.find((b) => b.value === data.brand)?.label;
  const modelLabel = modelsByBrand[data.brand]?.find((m) => m.value === data.model)?.label;
  if (!brandLabel || !modelLabel) return null;

  try {
    const res = await fetch("/api/phone-valuations/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        brand: brandLabel,
        model: modelLabel,
        storage: data.storage,
        ram: data.ram,
        age: data.age,
        condition: data.overallCondition || "good",
        displayCondition: data.displayCondition,
        batteryCondition: data.batteryCondition,
        bodyCondition: data.bodyCondition,
        cameraCondition: data.cameraCondition,
        accessoriesAvailable: false,
        originalBill: false,
        originalBox: false,
      }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.estimatedValue ?? null;
  } catch {
    return null;
  }
}

interface NewPhone {
  id: string;
  name: string;
  price: number;
  image: string;
}

const newPhones: NewPhone[] = [
  { id: "p1", name: "iPhone 15 (128GB)", price: 79900, image: "/placeholder-phone.png" },
  { id: "p2", name: "Samsung Galaxy S24 (128GB)", price: 64999, image: "/placeholder-phone.png" },
  { id: "p3", name: "OnePlus 12 (256GB)", price: 64999, image: "/placeholder-phone.png" },
  { id: "p4", name: "Nothing Phone 2a (128GB)", price: 23999, image: "/placeholder-phone.png" },
  { id: "p5", name: "Xiaomi 14 (512GB)", price: 69999, image: "/placeholder-phone.png" },
  { id: "p6", name: "Realme GT 5 Pro (256GB)", price: 33999, image: "/placeholder-phone.png" },
];

export default function ExchangePage() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [selectedNewPhone, setSelectedNewPhone] = useState<NewPhone | null>(null);
  const [requestNumber, setRequestNumber] = useState("");
  const [products, setProducts] = useState<Array<{ id: string; name: string; price: number; image: string }>>([]);
  const [serverEstimate, setServerEstimate] = useState<number | null>(null);

  const update = (key: string, value: string) => setData((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    fetch("/api/products?isActive=true&limit=20")
      .then((r) => r.json())
      .then((d) => {
        if (d.products) {
          setProducts(
            d.products.map((p: { id: string; name: string; variants: Array<{ price: number; images: string }> }) => ({
              id: p.id,
              name: p.name,
              price: p.variants?.[0]?.price || 0,
              image: p.variants?.[0]?.images ? JSON.parse(p.variants[0].images)[0] || "/placeholder-phone.png" : "/placeholder-phone.png",
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const displayPhones = products.length > 0 ? products : newPhones;

  const serverValue = serverEstimate ?? fallbackEstimateExchange(data);
  const exchangeValue = serverValue;
  const lowVal = Math.round(exchangeValue * 0.9 / 100) * 100;
  const highVal = Math.round(exchangeValue * 1.1 / 100) * 100;
  const difference = selectedNewPhone ? selectedNewPhone.price - exchangeValue : 0;

  const loadEstimate = useCallback(async () => {
    const val = await fetchServerExchangeEstimate(data);
    if (val !== null) setServerEstimate(val);
  }, [data]);

  const canProceed = () => {
    switch (step) {
      case 0: return !!data.brand && !!data.model && !!data.age;
      case 1: return !!data.displayCondition && !!data.batteryCondition;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/exchange-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldBrand: brands.find((b) => b.value === data.brand)?.label || data.brand,
          oldModel: modelsByBrand[data.brand]?.find((m) => m.value === data.model)?.label || data.model,
          oldStorage: data.storage,
          oldRam: data.ram,
          oldCondition: data.overallCondition || "good",
          newVariantId: selectedNewPhone?.id,
          oldDeviceDetails: {
            displayCondition: data.displayCondition,
            batteryCondition: data.batteryCondition,
            bodyCondition: data.bodyCondition,
            age: data.age,
          },
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setRequestNumber(result.exchangeRequest.requestNumber);
        setStep(6);
        toast.success("Exchange request submitted!");
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to submit request");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (canProceed()) {
      const nextStep = Math.min(step + 1, 6);
      if (nextStep === 2 && serverEstimate === null) {
        loadEstimate();
      }
      setStep(nextStep);
    }
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f97316] via-[#ea580c] to-[#c2410c] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:py-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <ArrowRightLeft className="h-8 w-8" />
          </div>
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Exchange Your Phone for a New One
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-orange-100">
            Trade in your old phone and get the best value towards a brand new device.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-orange-100">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Best Value Guarantee</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Instant Exchange</span>
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Doorstep Pickup</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between overflow-x-auto">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      i < step ? "bg-emerald-500 text-white"
                      : i === step ? "bg-[#f97316] text-white ring-4 ring-[#f97316]/20"
                      : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-gray-500 hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1 h-0.5 w-4 sm:w-8 ${i < step ? "bg-emerald-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Select Your Device</h2>
                    <p className="mt-1 text-sm text-gray-500">Tell us about the phone you want to exchange</p>
                  </div>
                  <Select label="Brand" required options={brands} value={data.brand || ""} onChange={(v) => { update("brand", v); update("model", ""); }} placeholder="Select brand" />
                  <Select label="Model" required options={data.brand ? modelsByBrand[data.brand] || [] : []} value={data.model || ""} onChange={(v) => update("model", v)} placeholder={data.brand ? "Select model" : "Select brand first"} disabled={!data.brand} />
                  <Select label="Device Age" required options={ageOptions} value={data.age || ""} onChange={(v) => update("age", v)} placeholder="Select age" />
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Device Condition</h2>
                    <p className="mt-1 text-sm text-gray-500">Be honest for an accurate estimate</p>
                  </div>
                  <Select label="Display Condition" required options={conditionOptions} value={data.displayCondition || ""} onChange={(v) => update("displayCondition", v)} placeholder="Select condition" />
                  <Select label="Battery Condition" required options={batteryOptions} value={data.batteryCondition || ""} onChange={(v) => update("batteryCondition", v)} placeholder="Select battery" />
                  <Select label="Body Condition" options={conditionOptions} value={data.bodyCondition || ""} onChange={(v) => update("bodyCondition", v)} placeholder="Select body condition" />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-gray-900">Exchange Value Estimate</h2>
                  <div className="rounded-2xl border-2 border-[#f97316]/20 bg-gradient-to-br from-[#f97316]/5 to-[#f97316]/10 p-8 text-center">
                    <ArrowRightLeft className="mx-auto mb-3 h-12 w-12 text-[#f97316]" />
                    <p className="text-sm text-gray-500">Your exchange value</p>
                    <p className="mt-1 text-3xl font-bold text-[#f97316]">
                      ₹{lowVal.toLocaleString("en-IN")} - ₹{highVal.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">Final value after inspection may vary</p>
                  </div>
                  <p className="text-center text-sm text-gray-500">Now choose a new phone to exchange for!</p>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Choose Your New Phone</h2>
                    <p className="mt-1 text-sm text-gray-500">Select a phone to exchange for</p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {displayPhones.map((phone) => (
                      <button
                        key={phone.id}
                        onClick={() => setSelectedNewPhone(phone)}
                        className={`rounded-xl border-2 p-4 text-left transition-all ${
                          selectedNewPhone?.id === phone.id
                            ? "border-[#f97316] bg-[#f97316]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gray-50">
                          <Smartphone className="h-12 w-12 text-gray-300" />
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900">{phone.name}</h3>
                        <p className="mt-1 text-sm font-bold text-[#f97316]">₹{phone.price.toLocaleString("en-IN")}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 4 && selectedNewPhone && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-gray-900">Price Difference</h2>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl bg-gray-50 p-4 text-center">
                      <p className="text-xs text-gray-500">Your Phone Value</p>
                      <p className="mt-1 text-xl font-bold text-[#f97316]">₹{exchangeValue.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="rounded-xl bg-gray-50 p-4 text-center">
                      <p className="text-xs text-gray-500">New Phone Price</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">₹{selectedNewPhone.price.toLocaleString("en-IN")}</p>
                    </div>
                    <div className={`rounded-xl p-4 text-center ${difference > 0 ? "bg-blue-50" : "bg-emerald-50"}`}>
                      <p className="text-xs text-gray-500">{difference > 0 ? "You Pay" : "You Get Back"}</p>
                      <p className={`mt-1 text-xl font-bold ${difference > 0 ? "text-[#2563eb]" : "text-emerald-600"}`}>
                        ₹{Math.abs(difference).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                    <Smartphone className="h-10 w-10 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900">{selectedNewPhone.name}</h3>
                      <p className="text-sm text-gray-500">₹{selectedNewPhone.price.toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <h2 className="text-xl font-semibold text-gray-900">Contact Details</h2>
                  <Input label="Full Name" required placeholder="John Doe" value={data.name || ""} onChange={(e) => update("name", e.target.value)} />
                  <Input label="Phone" required placeholder="+91 98765 43210" value={data.phone || ""} onChange={(e) => update("phone", e.target.value)} />
                  <Input label="Email" type="email" placeholder="john@example.com" value={data.email || ""} onChange={(e) => update("email", e.target.value)} />
                </div>
              )}

              {step === 6 && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Exchange Request Submitted!</h2>
                  <p className="mt-2 text-gray-500">
                    Request number: <span className="font-semibold text-[#f97316]">{requestNumber}</span>
                  </p>
                  <p className="mt-4 max-w-sm mx-auto text-sm text-gray-400">
                    We will contact you to arrange the pickup and delivery of your new phone.
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {step < 6 && (
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={prev} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step === 5 ? (
                <Button onClick={handleSubmit} loading={submitting}>Submit Exchange</Button>
              ) : (
                <Button onClick={next} disabled={!canProceed()}>Next <ArrowRight className="h-4 w-4" /></Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
