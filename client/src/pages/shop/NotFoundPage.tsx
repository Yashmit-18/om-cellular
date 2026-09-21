import { Link } from 'react-router-dom'
import { useEffect } from 'react'

export default function NotFoundPage() {
  useEffect(() => { document.title = 'Page Not Found | OM Cellular' }, [])

  return (
    <div className="container-custom py-24 text-center">
      <p className="text-7xl font-black text-brand-100">404</p>
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500">The page you're looking for doesn't exist or has been moved.</p>
      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link to="/" className="btn-primary">Back to Home</Link>
        <Link to="/buy-phones" className="btn-secondary">Browse Phones</Link>
      </div>
    </div>
  )
}