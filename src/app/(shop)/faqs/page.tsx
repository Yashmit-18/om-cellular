"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp, HelpCircle } from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then((data) => setFaqs(data.faqs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-8 text-center">
          <HelpCircle className="mx-auto h-12 w-12 text-[#2563eb]" />
          <h1 className="mt-4 text-3xl font-bold text-gray-900">Frequently Asked Questions</h1>
          <p className="mt-2 text-gray-500">Find answers to common questions about OM Cellular.</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
          </div>
        ) : faqs.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <p className="text-gray-500">No FAQs available yet. Check back soon!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-xl border border-gray-200 bg-white">
                <button
                  onClick={() => setOpenId(openId === faq.id ? null : faq.id)}
                  className="flex w-full items-center justify-between p-4 text-left"
                >
                  <div>
                    <p className="font-medium text-gray-900">{faq.question}</p>
                    {faq.category && (
                      <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                        {faq.category}
                      </span>
                    )}
                  </div>
                  {openId === faq.id ? (
                    <ChevronUp className="h-5 w-5 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
                  )}
                </button>
                {openId === faq.id && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <p className="text-sm leading-relaxed text-gray-600">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
