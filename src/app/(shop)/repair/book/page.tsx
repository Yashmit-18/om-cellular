"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Wrench, MapPin, Clock } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";

interface RepairService {
  id: string;
  name: string;
}

const problemCategories = [
  { value: "screen", label: "Screen / Display Issue" },
  { value: "battery", label: "Battery Problem" },
  { value: "charging", label: "Charging Issue" },
  { value: "camera", label: "Camera Problem" },
  { value: "software", label: "Software / OS Issue" },
  { value: "water", label: "Water Damage" },
  { value: "speaker", label: "Speaker / Mic Issue" },
  { value: "network", label: "Network / Signal Issue" },
  { value: "other", label: "Other" },
];

export default function RepairBookPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bookingNumber, setBookingNumber] = useState("");
  const [services, setServices] = useState<RepairService[]>([]);
  const [form, setForm] = useState({
    brand: "",
    model: "",
    problemCategory: "",
    serviceId: "",
    description: "",
    preferredDate: "",
    preferredTime: "",
    pickupRequired: false,
    pickupAddress: "",
    name: "",
    phone: "",
    email: "",
  });

  useEffect(() => {
    fetch("/api/repair-services")
      .then((r) => r.json())
      .then((d) => { if (d.services) setServices(d.services); })
      .catch(() => {});
  }, []);

  const update = (key: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.brand) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/repairs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "guest",
          serviceId: form.serviceId || undefined,
          brand: form.brand,
          model: form.model,
          problemDescription: form.description,
          pickupRequired: form.pickupRequired,
          pickupAddress: form.pickupRequired ? form.pickupAddress : undefined,
          appointmentDate: form.preferredDate || undefined,
          appointmentTime: form.preferredTime || undefined,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setBookingNumber(result.repair.bookingNumber);
        setSuccess(true);
        toast.success("Repair booking created!");
      } else {
        toast.error(result.error || "Something went wrong");
      }
    } catch {
      toast.error("Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 py-16">
        <div className="mx-auto max-w-lg px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Repair Booked!</h1>
            <p className="mt-2 text-gray-500">Your repair booking number is</p>
            <p className="mt-1 text-xl font-bold text-[#2563eb]">{bookingNumber}</p>
            <p className="mt-4 text-sm text-gray-400">
              Save this number to track your repair status. Our team will contact you shortly to confirm the appointment.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <a href={`/repair/track?id=${bookingNumber}`}>
                <Button className="w-full">Track Your Repair</Button>
              </a>
              <a href="/repair">
                <Button variant="ghost" className="w-full">Back to Repair Services</Button>
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Book a Repair</h1>
          <p className="mt-1 text-gray-500">Fill in the details below to schedule your repair</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Device Info */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Wrench className="h-5 w-5 text-[#2563eb]" /> Device Information
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Brand" required placeholder="e.g., Apple, Samsung" value={form.brand} onChange={(e) => update("brand", e.target.value)} />
              <Input label="Model" placeholder="e.g., iPhone 15 Pro" value={form.model} onChange={(e) => update("model", e.target.value)} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Select
                label="Problem Category"
                options={problemCategories}
                value={form.problemCategory}
                onChange={(v) => update("problemCategory", v)}
                placeholder="Select category"
              />
              {services.length > 0 && (
                <Select
                  label="Service (if known)"
                  options={services.map((s) => ({ value: s.id, label: s.name }))}
                  value={form.serviceId}
                  onChange={(v) => update("serviceId", v)}
                  placeholder="Select service"
                />
              )}
            </div>
            <div className="mt-4">
              <Textarea
                label="Problem Description"
                placeholder="Describe the issue you're facing..."
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
              />
            </div>
          </div>

          {/* Appointment */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-[#2563eb]" /> Preferred Appointment
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Preferred Date" type="date" value={form.preferredDate} onChange={(e) => update("preferredDate", e.target.value)} />
              <Input label="Preferred Time" type="time" value={form.preferredTime} onChange={(e) => update("preferredTime", e.target.value)} />
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-xl border border-gray-200 p-4">
              <input
                type="checkbox"
                id="pickup"
                checked={form.pickupRequired}
                onChange={(e) => update("pickupRequired", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-[#2563eb] focus:ring-[#2563eb]"
              />
              <label htmlFor="pickup" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <MapPin className="h-4 w-4 text-gray-400" />
                I need doorstep pickup
              </label>
            </div>

            {form.pickupRequired && (
              <div className="mt-4">
                <Textarea
                  label="Pickup Address"
                  placeholder="Full address with pincode"
                  value={form.pickupAddress}
                  onChange={(e) => update("pickupAddress", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Contact Information</h2>
            <div className="grid gap-4">
              <Input label="Full Name" required placeholder="John Doe" value={form.name} onChange={(e) => update("name", e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Phone" required placeholder="+91 98765 43210" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                <Input label="Email" type="email" placeholder="john@example.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" loading={submitting}>
            Book Repair
          </Button>
        </form>
      </div>
    </div>
  );
}
