import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { User, Package, Wrench, ArrowRightLeft, Smartphone } from 'lucide-react'

const accountLinks = [
  { to: '/account', label: 'My Account', icon: User },
  { to: '/account/profile', label: 'Profile & Addresses', icon: User },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/repairs', label: 'Repairs', icon: Wrench },
  { to: '/account/sell-requests', label: 'Sell Requests', icon: Smartphone },
  { to: '/account/exchange-requests', label: 'Exchange Requests', icon: ArrowRightLeft },
]

export default function AccountLayout() {
  const { user, loading, fetchUser } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <aside className="card p-4">
          <nav className="space-y-1">
            {accountLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === to
                    ? 'bg-brand-50 text-brand-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>
        <div>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
