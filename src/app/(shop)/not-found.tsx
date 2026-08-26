import Link from "next/link";

export default function ShopNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-[#2563eb] to-[#f97316] bg-clip-text text-8xl font-bold text-transparent">
          404
        </h1>
        <h2 className="mt-4 text-2xl font-bold text-gray-900">Page Not Found</h2>
        <p className="mt-3 text-gray-500">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
          >
            Back to Home
          </Link>
          <Link
            href="/phones"
            className="rounded-lg border border-[#2563eb] px-6 py-3 text-sm font-semibold text-[#2563eb] transition-colors hover:bg-[#2563eb]/5"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </div>
  )
}
