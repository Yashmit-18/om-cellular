"use client";

import { useState, useEffect } from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import BusinessInfo from "@/components/layout/BusinessInfo";

export default function ContactPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [mapsUrl, setMapsUrl] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          const map: Record<string, string> = {};
          for (const s of data.settings) map[s.key] = s.value;
          if (map.business_maps) setMapsUrl(map.business_maps);
        }
      })
      .catch(() => {});
  }, []);

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/contact-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
        toast.success("Message sent! We'll get back to you soon.");
      } else {
        toast.error("Failed to send message");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Contact Us</h1>
          <p className="mt-2 text-gray-500">We&apos;d love to hear from you. Get in touch with us.</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Contact Info */}
          <BusinessInfo section="contact" />

          {/* Contact Form */}
          <div className="lg:col-span-2">
            {success ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Message Sent!</h2>
                <p className="mt-2 text-gray-500">Thank you for reaching out. We&apos;ll get back to you within 24 hours.</p>
                <Button className="mt-6" onClick={() => { setSuccess(false); setForm({ name: "", email: "", phone: "", subject: "", message: "" }); }}>
                  Send Another Message
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
                <h2 className="mb-6 text-lg font-semibold text-gray-900">Send us a Message</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Name" required placeholder="Your name" value={form.name} onChange={(e) => update("name", e.target.value)} />
                    <Input label="Email" required type="email" placeholder="your@email.com" value={form.email} onChange={(e) => update("email", e.target.value)} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Phone" placeholder="+91 98765 43210" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
                    <Input label="Subject" placeholder="How can we help?" value={form.subject} onChange={(e) => update("subject", e.target.value)} />
                  </div>
                  <Textarea label="Message" required placeholder="Write your message here..." value={form.message} onChange={(e) => update("message", e.target.value)} className="min-h-[150px]" />
                  <Button type="submit" size="lg" loading={submitting}>Send Message</Button>
                </form>
              </div>
            )}

            {/* Map */}
            {mapsUrl ? (
              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 h-64">
                <iframe
                  src={mapsUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Business Location"
                />
              </div>
            ) : (
              <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100 h-64 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-400">Google Maps integration coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
