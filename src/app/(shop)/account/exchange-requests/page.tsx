"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRightLeft, ArrowLeft } from "lucide-react";

interface ExchangeRequest {
  id: string;
  requestNumber: string;
  oldBrand: string;
  oldModel: string;
  status: string;
  estimatedExchangeValue: number | null;
  createdAt: string;
}

export default function ExchangeRequestsPage() {
  const [requests, setRequests] = useState<ExchangeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/exchange-requests")
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <Link href="/account" className="mb-6 inline-flex items-center gap-1 text-sm text-[#2563eb] hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to Account
        </Link>
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Exchange Requests</h1>

        {loading ? (
          <div className="rounded-2xl border bg-white p-8 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
          </div>
        ) : requests.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <ArrowRightLeft className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">No exchange requests</h3>
            <p className="mt-2 text-sm text-gray-500">Exchange your old phone for a new one.</p>
            <Link href="/exchange" className="mt-4 inline-block rounded-lg bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d4ed8]">
              Exchange Phone
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{r.requestNumber}</p>
                    <p className="text-xs text-gray-500">{r.oldBrand} {r.oldModel} &middot; {new Date(r.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.estimatedExchangeValue && (
                      <p className="text-sm font-bold text-[#2563eb]">₹{r.estimatedExchangeValue.toLocaleString("en-IN")}</p>
                    )}
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                      r.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                      r.status === "REJECTED" ? "bg-red-50 text-red-700" :
                      "bg-yellow-50 text-yellow-700"
                    }`}>
                      {r.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
