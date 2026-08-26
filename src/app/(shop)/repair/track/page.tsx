"use client";

import { useState } from "react";
import { Search, CheckCircle2, Clock, Circle, Package } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Card from "@/components/ui/card";

const TRACK_STATUSES = [
  { key: "BOOKING_RECEIVED", label: "Booking Received" },
  { key: "DEVICE_COLLECTED", label: "Device Collected" },
  { key: "DIAGNOSIS_STARTED", label: "Diagnosis Started" },
  { key: "DIAGNOSIS_COMPLETED", label: "Diagnosis Completed" },
  { key: "REPAIR_IN_PROGRESS", label: "Repair In Progress" },
  { key: "QUALITY_CHECK", label: "Quality Check" },
  { key: "READY_FOR_DELIVERY", label: "Ready for Delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

interface RepairData {
  bookingNumber: string;
  brand: string;
  model: string;
  status: string;
  estimatedCost: number | null;
  technicianName: string | null;
  appointmentDate: string | null;
  createdAt: string;
  statusHistory: Array<{ status: string; note: string | null; createdAt: string }>;
}

export default function RepairTrackPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [repair, setRepair] = useState<RepairData | null>(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    setRepair(null);
    try {
      const res = await fetch(`/api/repairs?search=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (data.repairs && data.repairs.length > 0) {
        setRepair(data.repairs[0]);
      } else {
        setError("No repair found with that ID or phone number.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!repair) return -1;
    return TRACK_STATUSES.findIndex((s) => s.key === repair.status);
  };

  const completedStatuses = new Set(
    (repair?.statusHistory || []).map((h) => h.status)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Track Repair Status</h1>
          <p className="mt-1 text-gray-500">Enter your repair booking number to check the status</p>
        </div>

        {/* Search */}
        <div className="mb-8 flex gap-3">
          <Input
            placeholder="Enter Repair ID (e.g., OMR-2026-123456)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            iconPrefix={<Search className="h-4 w-4" />}
          />
          <Button onClick={handleSearch} loading={loading}>
            Search
          </Button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {repair && (
          <div className="space-y-6">
            {/* Repair details */}
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{repair.brand} {repair.model}</h2>
                  <p className="mt-1 text-sm text-gray-500">Booking: {repair.bookingNumber}</p>
                  <p className="text-xs text-gray-400">Date: {new Date(repair.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                {repair.estimatedCost && (
                  <div className="text-right">
                    <p className="text-xs text-gray-400">Estimated Cost</p>
                    <p className="text-lg font-bold text-[#2563eb]">₹{repair.estimatedCost.toLocaleString("en-IN")}</p>
                  </div>
                )}
              </div>
              {repair.technicianName && (
                <p className="mt-3 text-sm text-gray-500">Technician: <span className="font-medium">{repair.technicianName}</span></p>
              )}
            </Card>

            {/* Timeline */}
            <Card>
              <h3 className="mb-6 text-lg font-semibold text-gray-900">Repair Timeline</h3>
              <div className="relative">
                {TRACK_STATUSES.map((status, i) => {
                  const isCompleted = completedStatuses.has(status.key);
                  const isCurrent = repair.status === status.key;
                  const isFuture = !isCompleted && !isCurrent;
                  const historyEntry = repair.statusHistory.find((h) => h.status === status.key);

                  return (
                    <div key={status.key} className="flex gap-4 pb-6 last:pb-0">
                      <div className="flex flex-col items-center">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                          isCompleted ? "bg-emerald-500 text-white"
                          : isCurrent ? "bg-[#2563eb] text-white ring-4 ring-[#2563eb]/20"
                          : "bg-gray-200 text-gray-400"
                        }`}>
                          {isCompleted ? <CheckCircle2 className="h-5 w-5" />
                          : isCurrent ? <Clock className="h-4 w-4" />
                          : <Circle className="h-4 w-4" />}
                        </div>
                        {i < TRACK_STATUSES.length - 1 && (
                          <div className={`mt-1 h-full w-0.5 ${
                            isCompleted ? "bg-emerald-500" : "bg-gray-200"
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${
                          isFuture ? "text-gray-400" : isCompleted ? "text-gray-900" : "text-[#2563eb]"
                        }`}>
                          {status.label}
                        </p>
                        {historyEntry && (
                          <p className="text-xs text-gray-400">
                            {new Date(historyEntry.createdAt).toLocaleString("en-IN")}
                            {historyEntry.note && ` - ${historyEntry.note}`}
                          </p>
                        )}
                        {isCurrent && (
                          <span className="mt-1 inline-block rounded-full bg-[#2563eb]/10 px-2 py-0.5 text-xs font-medium text-[#2563eb]">
                            Current Status
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {!repair && !error && !loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-sm text-gray-400">Enter your booking number above to track your repair</p>
          </div>
        )}
      </div>
    </div>
  );
}
