"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smartphone,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Package,
  Clock,
  Shield,
  IndianRupee,
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
  { value: "nothing", label: "Nothing" },
  { value: "motorola", label: "Motorola" },
  { value: "google", label: "Google" },
];

const modelsByBrand: Record<string, { value: string; label: string }[]> = {
  apple: [
    { value: "iphone-15-pro-max", label: "iPhone 15 Pro Max" },
    { value: "iphone-15-pro", label: "iPhone 15 Pro" },
    { value: "iphone-15", label: "iPhone 15" },
    { value: "iphone-14-pro-max", label: "iPhone 14 Pro Max" },
    { value: "iphone-14", label: "iPhone 14" },
    { value: "iphone-13", label: "iPhone 13" },
    { value: "iphone-12", label: "iPhone 12" },
    { value: "iphone-se-2022", label: "iPhone SE (2022)" },
  ],
  samsung: [
    { value: "galaxy-s24-ultra", label: "Galaxy S24 Ultra" },
    { value: "galaxy-s24", label: "Galaxy S24" },
    { value: "galaxy-s23-ultra", label: "Galaxy S23 Ultra" },
    { value: "galaxy-s23", label: "Galaxy S23" },
    { value: "galaxy-a55", label: "Galaxy A55" },
    { value: "galaxy-a35", label: "Galaxy A35" },
    { value: "galaxy-z-flip5", label: "Galaxy Z Flip5" },
  ],
  oneplus: [
    { value: "oneplus-12", label: "OnePlus 12" },
    { value: "oneplus-11", label: "OnePlus 11" },
    { value: "oneplus-nord-ce4", label: "OnePlus Nord CE4" },
    { value: "oneplus-nord-3", label: "OnePlus Nord 3" },
  ],
  xiaomi: [
    { value: "xiaomi-14", label: "Xiaomi 14" },
    { value: "redmi-note-13-pro", label: "Redmi Note 13 Pro" },
    { value: "poco-x6-pro", label: "Poco X6 Pro" },
  ],
  realme: [
    { value: "realme-gt-5-pro", label: "Realme GT 5 Pro" },
    { value: "realme-12-pro-plus", label: "Realme 12 Pro+" },
    { value: "realme-narzo-70x", label: "Realme Narzo 70x" },
  ],
  vivo: [
    { value: "vivo-x100-pro", label: "Vivo X100 Pro" },
    { value: "vivo-v30", label: "Vivo V30" },
    { value: "vivo-t3", label: "Vivo T3" },
  ],
  oppo: [
    { value: "oppo-find-x7", label: "OPPO Find X7" },
    { value: "oppo-reno-11", label: "OPPO Reno 11" },
  ],
  nothing: [
    { value: "nothing-phone-2a", label: "Nothing Phone (2a)" },
    { value: "nothing-phone-2", label: "Nothing Phone (2)" },
  ],
  motorola: [
    { value: "moto-edge-50-pro", label: "Moto Edge 50 Pro" },
    { value: "moto-g84", label: "Moto G84" },
  ],
  google: [
    { value: "pixel-8-pro", label: "Pixel 8 Pro" },
    { value: "pixel-8a", label: "Pixel 8a" },
  ],
};

const storageOptions = [
  { value: "32", label: "32 GB" },
  { value: "64", label: "64 GB" },
  { value: "128", label: "128 GB" },
  { value: "256", label: "256 GB" },
  { value: "512", label: "512 GB" },
  { value: "1024", label: "1 TB" },
];

const ramOptions = [
  { value: "3", label: "3 GB" },
  { value: "4", label: "4 GB" },
  { value: "6", label: "6 GB" },
  { value: "8", label: "8 GB" },
  { value: "12", label: "12 GB" },
  { value: "16", label: "16 GB" },
];

const ageOptions = [
  { value: "less-6", label: "Less than 6 months" },
  { value: "6-12", label: "6 - 12 months" },
  { value: "1-2", label: "1 - 2 years" },
  { value: "2-3", label: "2 - 3 years" },
  { value: "3-plus", label: "3+ years" },
];

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

const STEPS = ["Device", "Age", "Condition", "Accessories", "Estimate", "Contact", "Done"];

function fallbackEstimate(data: Record<string, string>): number {
  let base = 15000;
  if (data.brand === "apple") base = 35000;
  else if (data.brand === "samsung") base = 25000;
  else if (data.brand === "oneplus") base = 22000;

  if (data.storage === "256" || data.storage === "512" || data.storage === "1024") base *= 1.3;
  else if (data.storage === "128") base *= 1.1;

  if (data.ram === "12" || data.ram === "16") base *= 1.15;

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

  if (data.bodyCondition === "perfect") base *= 1;
  else if (data.bodyCondition === "minor-scratches") base *= 0.93;
  else if (data.bodyCondition === "cracked") base *= 0.75;

  if (data.originalBill === "yes") base *= 1.05;
  if (data.originalBox === "yes") base *= 1.02;

  return Math.round(base / 100) * 100;
}

async function fetchServerEstimate(data: Record<string, string>): Promise<number | null> {
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
        storage: data.storage ? storageOptions.find((s) => s.value === data.storage)?.label : undefined,
        ram: data.ram ? ramOptions.find((r) => r.value === data.ram)?.label : undefined,
        age: data.age,
        condition: data.overallCondition || "good",
        displayCondition: data.displayCondition,
        batteryCondition: data.batteryCondition,
        bodyCondition: data.bodyCondition,
        cameraCondition: data.cameraCondition,
        accessoriesAvailable: data.accessories === "yes",
        originalBill: data.originalBill === "yes",
        originalBox: data.originalBox === "yes",
      }),
    });
    if (!res.ok) return null;
    const result = await res.json();
    return result.estimatedValue ?? null;
  } catch {
    return null;
  }
}

export default function SellPhonePage() {
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<Record<string, string>>({});
  const [requestNumber, setRequestNumber] = useState("");
  const [serverEstimate, setServerEstimate] = useState<number | null>(null);

  const update = (key: string, value: string) => setData((prev) => ({ ...prev, [key]: value }));

  const canProceed = () => {
    switch (step) {
      case 0: return !!data.brand && !!data.model;
      case 1: return !!data.age;
      case 2: return !!data.displayCondition && !!data.batteryCondition;
      case 3: return true;
      case 4: return true;
      case 5: return !!data.name && !!data.phone;
      default: return true;
    }
  };

  const serverValue = serverEstimate ?? fallbackEstimate(data);
  const estimatedPrice = serverValue;
  const lowEstimate = Math.round(estimatedPrice * 0.9 / 100) * 100;
  const highEstimate = Math.round(estimatedPrice * 1.1 / 100) * 100;

  const loadEstimate = useCallback(async () => {
    const val = await fetchServerEstimate(data);
    if (val !== null) setServerEstimate(val);
  }, [data]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/sell-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: brands.find((b) => b.value === data.brand)?.label || data.brand,
          model: modelsByBrand[data.brand]?.find((m) => m.value === data.model)?.label || data.model,
          storage: data.storage ? storageOptions.find((s) => s.value === data.storage)?.label : undefined,
          ram: data.ram ? ramOptions.find((r) => r.value === data.ram)?.label : undefined,
          age: data.age,
          condition: data.overallCondition || "good",
          displayCondition: data.displayCondition,
          batteryCondition: data.batteryCondition,
          cameraCondition: data.cameraCondition,
          bodyCondition: data.bodyCondition,
          originalBill: data.originalBill === "yes",
          originalBox: data.originalBox === "yes",
          accessoriesAvailable: data.accessories === "yes",
          pickupAddress: data.address,
          pickupDate: data.pickupDate,
          pickupTime: data.pickupTime,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setRequestNumber(result.sellRequest.requestNumber);
        setStep(6);
        toast.success("Sell request submitted successfully!");
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to submit request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const next = () => {
    if (canProceed()) {
      const nextStep = Math.min(step + 1, 6);
      if (nextStep === 4 && serverEstimate === null) {
        loadEstimate();
      }
      setStep(nextStep);
    }
  };
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e40af] text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.05%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 text-center sm:py-20">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
            <IndianRupee className="h-8 w-8" />
          </div>
          <h1 className="mb-4 text-3xl font-bold sm:text-4xl lg:text-5xl">
            Sell Your Phone at the Best Possible Price
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-blue-100">
            Get instant quotes and doorstep pickup. Fast, transparent, and hassle-free.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-blue-100">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4" /> Secure Process</span>
            <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> 24hr Pickup</span>
            <span className="flex items-center gap-2"><Package className="h-4 w-4" /> Doorstep Service</span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Progress */}
        <div className="mb-10">
          <div className="flex items-center justify-between">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      i < step
                        ? "bg-emerald-500 text-white"
                        : i === step
                        ? "bg-[#2563eb] text-white ring-4 ring-[#2563eb]/20"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {i < step ? <CheckCircle2 className="h-5 w-5" /> : i + 1}
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-gray-500 hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-1 h-0.5 w-4 sm:w-10 ${i < step ? "bg-emerald-500" : "bg-gray-200"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Select Your Device</h2>
                    <p className="mt-1 text-sm text-gray-500">Tell us about your phone</p>
                  </div>
                  <Select
                    label="Brand"
                    required
                    options={brands}
                    value={data.brand || ""}
                    onChange={(v) => { update("brand", v); update("model", ""); }}
                    placeholder="Select brand"
                  />
                  <Select
                    label="Model"
                    required
                    options={data.brand ? modelsByBrand[data.brand] || [] : []}
                    value={data.model || ""}
                    onChange={(v) => update("model", v)}
                    placeholder={data.brand ? "Select model" : "Select brand first"}
                    disabled={!data.brand}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Select
                      label="Storage"
                      options={storageOptions}
                      value={data.storage || ""}
                      onChange={(v) => update("storage", v)}
                      placeholder="Select storage"
                    />
                    <Select
                      label="RAM"
                      options={ramOptions}
                      value={data.ram || ""}
                      onChange={(v) => update("ram", v)}
                      placeholder="Select RAM"
                    />
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Device Age</h2>
                    <p className="mt-1 text-sm text-gray-500">How old is your device?</p>
                  </div>
                  <div className="grid gap-3">
                    {ageOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => update("age", opt.value)}
                        className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                          data.age === opt.value
                            ? "border-[#2563eb] bg-[#2563eb]/5"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        <div className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                          data.age === opt.value ? "border-[#2563eb]" : "border-gray-300"
                        }`}>
                          {data.age === opt.value && <div className="h-2.5 w-2.5 rounded-full bg-[#2563eb]" />}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Device Condition</h2>
                    <p className="mt-1 text-sm text-gray-500">Help us understand the condition better</p>
                  </div>
                  <Select
                    label="Overall Condition"
                    options={[
                      { value: "like-new", label: "Like New" },
                      { value: "good", label: "Good" },
                      { value: "average", label: "Average" },
                      { value: "poor", label: "Poor" },
                    ]}
                    value={data.overallCondition || ""}
                    onChange={(v) => update("overallCondition", v)}
                    placeholder="Select overall condition"
                  />
                  <Select
                    label="Display Condition"
                    required
                    options={conditionOptions}
                    value={data.displayCondition || ""}
                    onChange={(v) => update("displayCondition", v)}
                    placeholder="Select display condition"
                  />
                  <Select
                    label="Battery Condition"
                    required
                    options={batteryOptions}
                    value={data.batteryCondition || ""}
                    onChange={(v) => update("batteryCondition", v)}
                    placeholder="Select battery condition"
                  />
                  <Select
                    label="Camera Condition"
                    options={conditionOptions}
                    value={data.cameraCondition || ""}
                    onChange={(v) => update("cameraCondition", v)}
                    placeholder="Select camera condition"
                  />
                  <Select
                    label="Body Condition"
                    options={conditionOptions}
                    value={data.bodyCondition || ""}
                    onChange={(v) => update("bodyCondition", v)}
                    placeholder="Select body condition"
                  />
                </div>
              )}

              {step === 3 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Accessories & Documents</h2>
                    <p className="mt-1 text-sm text-gray-500">Do you have these items?</p>
                  </div>
                  {[
                    { key: "originalBill", label: "Original Bill / Invoice" },
                    { key: "originalBox", label: "Original Box" },
                    { key: "accessories", label: "Accessories (Charger, Earphones)" },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                      <span className="text-sm font-medium text-gray-900">{item.label}</span>
                      <div className="flex gap-2">
                        {["yes", "no"].map((v) => (
                          <button
                            key={v}
                            onClick={() => update(item.key, v)}
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                              data[item.key] === v
                                ? v === "yes"
                                  ? "bg-emerald-500 text-white"
                                  : "bg-red-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                            }`}
                          >
                            {v === "yes" ? "Yes" : "No"}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {step === 4 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Your Estimated Value</h2>
                    <p className="mt-1 text-sm text-gray-500">Based on the details you provided</p>
                  </div>
                  <div className="rounded-2xl border-2 border-[#2563eb]/20 bg-gradient-to-br from-[#2563eb]/5 to-[#2563eb]/10 p-8 text-center">
                    <Smartphone className="mx-auto mb-3 h-12 w-12 text-[#2563eb]" />
                    <p className="text-sm text-gray-500">Estimated Value</p>
                    <p className="mt-1 text-3xl font-bold text-[#2563eb]">
                      ₹{lowEstimate.toLocaleString("en-IN")} - ₹{highEstimate.toLocaleString("en-IN")}
                    </p>
                    <p className="mt-2 text-xs text-gray-400">Final price may vary after device inspection</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Brand</span>
                      <p className="font-medium">{brands.find((b) => b.value === data.brand)?.label}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Model</span>
                      <p className="font-medium">{modelsByBrand[data.brand]?.find((m) => m.value === data.model)?.label}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Age</span>
                      <p className="font-medium">{ageOptions.find((a) => a.value === data.age)?.label}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <span className="text-gray-500">Display</span>
                      <p className="font-medium">{conditionOptions.find((c) => c.value === data.displayCondition)?.label}</p>
                    </div>
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Contact & Pickup Details</h2>
                    <p className="mt-1 text-sm text-gray-500">Where should we pick up the device?</p>
                  </div>
                  <Input
                    label="Full Name"
                    required
                    placeholder="John Doe"
                    value={data.name || ""}
                    onChange={(e) => update("name", e.target.value)}
                  />
                  <Input
                    label="Phone Number"
                    required
                    placeholder="+91 98765 43210"
                    value={data.phone || ""}
                    onChange={(e) => update("phone", e.target.value)}
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="john@example.com"
                    value={data.email || ""}
                    onChange={(e) => update("email", e.target.value)}
                  />
                  <div className="w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Pickup Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 focus:border-[#2563eb] resize-y min-h-[80px]"
                      placeholder="Full address with pincode"
                      value={data.address || ""}
                      onChange={(e) => update("address", e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Preferred Pickup Date"
                      type="date"
                      value={data.pickupDate || ""}
                      onChange={(e) => update("pickupDate", e.target.value)}
                    />
                    <Input
                      label="Preferred Time"
                      type="time"
                      value={data.pickupTime || ""}
                      onChange={(e) => update("pickupTime", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="py-8 text-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Request Submitted!</h2>
                  <p className="mt-2 text-gray-500">
                    Your request number is <span className="font-semibold text-[#2563eb]">{requestNumber}</span>
                  </p>
                  <p className="mt-4 max-w-sm mx-auto text-sm text-gray-400">
                    We will review your details and get back to you within 24 hours with a final offer. Keep your phone in the condition you described.
                  </p>
                  <div className="mt-8 rounded-xl bg-gray-50 p-4">
                    <p className="text-sm text-gray-500">Estimated Value</p>
                    <p className="text-2xl font-bold text-[#2563eb]">
                      ₹{lowEstimate.toLocaleString("en-IN")} - ₹{highEstimate.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Estimated value sidebar */}
          {step < 5 && step > 0 && (
            <div className="mt-6 rounded-xl bg-[#f97316]/5 border border-[#f97316]/20 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Current Estimate</span>
                <span className="text-lg font-bold text-[#f97316]">
                  ₹{lowEstimate.toLocaleString("en-IN")} - ₹{highEstimate.toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step < 6 && (
            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" onClick={prev} disabled={step === 0}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              {step === 4 ? (
                <Button onClick={next}>
                  Continue Selling <ArrowRight className="h-4 w-4" />
                </Button>
              ) : step === 5 ? (
                <Button onClick={handleSubmit} loading={submitting}>
                  Submit Request
                </Button>
              ) : (
                <Button onClick={next} disabled={!canProceed()}>
                  Next <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
