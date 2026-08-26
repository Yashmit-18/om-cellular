import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-[#2563eb] to-[#f97316] bg-clip-text text-7xl font-bold text-transparent">
          404
        </h1>
        <h2 className="mt-4 text-xl font-bold text-gray-900">Page Not Found</h2>
        <p className="mt-3 text-gray-500">
          The admin page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/admin"
          className="mt-8 inline-block rounded-lg bg-[#2563eb] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1d4ed8]"
        >
          Back to Admin
        </Link>
      </div>
    </div>
  )
}
