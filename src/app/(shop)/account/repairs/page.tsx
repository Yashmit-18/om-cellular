"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Wrench, ChevronRight } from "lucide-react";
import Card from "@/components/ui/card";
import StatusBadge from "@/components/ui/status-badge";
import EmptyState from "@/components/ui/empty-state";

interface RepairBooking {
  id: string;
  bookingNumber: string;
  brand: string;
  model: string;
  status: string;
  estimatedCost: number | null;
  createdAt: string;
}

export default function RepairHistoryPage() {
  const [repairs, setRepairs] = useState<RepairBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/repairs")
      .then((r) => r.json())
      .then((d) => { setRepairs(d.repairs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="mb-8 text-2xl font-bold text-gray-900">Repair History</h1>

        {loading ? (
          <div className="text-center py-10">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-[#2563eb]" />
          </div>
        ) : repairs.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title="No repair bookings"
            description="You haven't booked any repairs yet."
            actionLabel="Book a Repair"
            onAction={() => (window.location.href = "/repair/book")}
          />
        ) : (
          <div className="space-y-4">
            {repairs.map((repair) => (
              <Link key={repair.id} href={`/repair/track?id=${repair.bookingNumber}`}>
                <Card hover>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{repair.bookingNumber}</p>
                      <p className="text-xs text-gray-500">{repair.brand} {repair.model}</p>
                      <p className="text-xs text-gray-400">{new Date(repair.createdAt).toLocaleDateString("en-IN")}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={repair.status} />
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
