"use client";

import { useState, useEffect } from "react";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";
import Link from "next/link";
import Button from "@/components/ui/button";
import LoadingSkeleton from "@/components/ui/loading-skeleton";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

const defaultFAQs: FAQ[] = [
  { id: "1", question: "How do I sell my phone on OM Cellular?", answer: "Simply visit our Sell Phone page, select your device brand and model, answer a few condition questions, and get an instant estimate. Once you accept the offer, we'll schedule a doorstep pickup.", category: "Selling" },
  { id: "2", question: "What condition should my phone be in to sell?", answer: "We buy phones in all conditions - from perfect to not working. The price varies based on the condition. Even phones with cracked screens or battery issues have value.", category: "Selling" },
  { id: "3", question: "How long does the repair take?", answer: "Most repairs are completed within 24-48 hours. Screen replacements and battery changes can often be done in 1-2 hours. Complex repairs like water damage may take longer.", category: "Repairs" },
  { id: "4", question: "Do you use genuine parts for repairs?", answer: "Yes, we use genuine and high-quality OEM parts for all repairs. Each repair comes with a warranty ranging from 30 to 180 days depending on the service.", category: "Repairs" },
  { id: "5", question: "How does the exchange process work?", answer: "Get an estimate for your old phone, choose a new phone from our catalog, pay the difference (if any), and we'll deliver the new phone while picking up the old one.", category: "Exchange" },
  { id: "6", question: "What payment methods do you accept?", answer: "We accept Cash on Delivery (COD) as our primary payment method. UPI, credit/debit cards, and net banking integrations are coming soon.", category: "Orders" },
  { id: "7", question: "What is your return policy?", answer: "We offer a 7-day return policy on all purchased products. The device must be in its original condition with all accessories. Refurbished phones come with a 3-day return window.", category: "Orders" },
  { id: "8", question: "Is there a warranty on refurbished phones?", answer: "Yes, all our refurbished phones come with a 6-month warranty covering manufacturing defects. Extended warranty options are available at checkout.", category: "Buying" },
  { id: "9", question: "How do I track my repair status?", answer: "Visit the Track Repair page and enter your repair booking number (e.g., OMR-2026-123456). You'll see a real-time timeline of your repair progress.", category: "Repairs" },
  { id: "10", question: "Do you offer doorstep pickup and delivery?", answer: "Yes! We offer free doorstep pickup for sell/exchange requests and repair services. Standard delivery on orders above ₹999 is free.", category: "General" },
];

export default function FAQPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then((d) => {
        if (d.faqs && d.faqs.length > 0) {
          setFaqs(d.faqs);
        } else {
          setFaqs(defaultFAQs);
        }
        setLoading(false);
      })
      .catch(() => {
        setFaqs(defaultFAQs);
        setLoading(false);
      });
  }, []);

  const categories = ["All", ...Array.from(new Set(faqs.map((f) => f.category).filter(Boolean))) as string[]];
  const filtered = activeCategory === "All" ? faqs : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#2563eb]/10">
            <HelpCircle className="h-7 w-7 text-[#2563eb]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Frequently Asked Questions</h1>
          <p className="mt-2 text-gray-500">Find answers to common questions about our services</p>
        </div>

        {/* Categories */}
        <div className="mb-8 flex flex-wrap justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat
                  ? "bg-[#2563eb] text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSkeleton variant="text" count={5} />
        ) : (
          <div className="space-y-3">
            {filtered.map((faq) => (
              <div key={faq.id} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="flex w-full items-center justify-between p-5 text-left"
                >
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.question}</span>
                  <ChevronDown className={`h-5 w-5 shrink-0 text-gray-400 transition-transform ${openId === faq.id ? "rotate-180" : ""}`} />
                </button>
                {openId === faq.id && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4">
                    <p className="text-sm text-gray-600 leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <MessageCircle className="mx-auto mb-3 h-8 w-8 text-[#2563eb]" />
          <h2 className="text-lg font-semibold text-gray-900">Still have questions?</h2>
          <p className="mt-1 text-sm text-gray-500">Can&apos;t find what you&apos;re looking for? Contact our support team.</p>
          <Link href="/contact" className="mt-4 inline-block">
            <Button>Contact Us</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
