"use client";

type SkeletonVariant = "text" | "card" | "product-card" | "table";

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  count?: number;
  className?: string;
}

function TextSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      <div className="h-4 bg-gray-200 rounded-full w-full animate-pulse" />
      <div className="h-4 bg-gray-200 rounded-full w-4/5 animate-pulse" />
      <div className="h-4 bg-gray-200 rounded-full w-3/5 animate-pulse" />
    </div>
  );
}

function CardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 ${className}`}>
      <div className="h-40 bg-gray-200 rounded-lg animate-pulse mb-4" />
      <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse mb-2.5" />
      <div className="h-4 bg-gray-200 rounded-full w-1/2 animate-pulse mb-4" />
      <div className="flex justify-between items-center">
        <div className="h-5 bg-gray-200 rounded-full w-20 animate-pulse" />
        <div className="h-8 bg-gray-200 rounded-lg w-24 animate-pulse" />
      </div>
    </div>
  );
}

function ProductCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="aspect-square bg-gray-200 animate-pulse" />
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded-full w-3/4 animate-pulse mb-2" />
        <div className="h-3 bg-gray-200 rounded-full w-1/2 animate-pulse mb-3" />
        <div className="flex items-center gap-2 mb-3">
          <div className="h-3 bg-gray-200 rounded-full w-16 animate-pulse" />
        </div>
        <div className="flex justify-between items-center">
          <div className="h-5 bg-gray-200 rounded-full w-16 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded-lg w-20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function TableRowSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 border-b border-gray-100 ${className}`}>
      <div className="h-10 w-10 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-gray-200 rounded-full w-2/5 animate-pulse" />
        <div className="h-3 bg-gray-200 rounded-full w-3/5 animate-pulse" />
      </div>
      <div className="h-6 bg-gray-200 rounded-full w-16 animate-pulse flex-shrink-0" />
      <div className="h-8 bg-gray-200 rounded-lg w-20 animate-pulse flex-shrink-0" />
    </div>
  );
}

const variantComponents: Record<SkeletonVariant, typeof TextSkeleton> = {
  text: TextSkeleton,
  card: CardSkeleton,
  "product-card": ProductCardSkeleton,
  table: TableRowSkeleton,
};

export default function LoadingSkeleton({ variant = "text", count = 3, className = "" }: LoadingSkeletonProps) {
  const Component = variantComponents[variant];
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <Component key={i} className={className} />
      ))}
    </div>
  );
}

export { LoadingSkeleton };
