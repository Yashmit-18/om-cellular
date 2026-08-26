"use client";

type StatusType =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "completed"
  | "active"
  | "inactive"
  | "in-stock"
  | "out-of-stock"
  | "low-stock";

interface StatusBadgeProps {
  status: StatusType | string;
  className?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  processing: { label: "Processing", className: "bg-blue-50 text-[#2563eb] ring-1 ring-blue-200" },
  shipped: { label: "Shipped", className: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200" },
  delivered: { label: "Delivered", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  cancelled: { label: "Cancelled", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  completed: { label: "Completed", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  active: { label: "Active", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  inactive: { label: "Inactive", className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200" },
  "in-stock": { label: "In Stock", className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  "out-of-stock": { label: "Out of Stock", className: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  "low-stock": { label: "Low Stock", className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
};

export default function StatusBadge({ status, className = "" }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/\s+/g, "-");
  const config = statusConfig[key] || {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium rounded-full ${config.className} ${className}`}
    >
      {config.label}
    </span>
  );
}

export { StatusBadge };
