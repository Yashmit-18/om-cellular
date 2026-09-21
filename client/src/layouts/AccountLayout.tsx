import { Outlet, Navigate, Link, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { User, Package, Wrench, ArrowRightLeft, Smartphone, Bell, RotateCcw } from 'lucide-react'

const accountLinks = [
  { to: '/account', label: 'My Account', icon: User },
  { to: '/account/profile', label: 'Profile & Addresses', icon: User },
  { to: '/account/orders', label: 'Orders', icon: Package },
  { to: '/account/returns', label: 'Returns & Refunds', icon: RotateCcw },
  { to: '/account/repairs', label: 'Repairs', icon: Wrench },
  { to: '/account/sell-requests', label: 'Sell Requests', icon: Smartphone },
  { to: '/account/exchange-requests', label: 'Exchange Requests', icon: ArrowRightLeft },
  { to: '/account/notifications', label: 'Notifications', icon: Bell },
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
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-navy-900 border-t-transparent"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  const isActive = (to: string) =>
    to === '/account'
      ? location.pathname === '/account'
      : location.pathname === to || location.pathname.startsWith(to + '/')

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 md:py-12">
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside className="card h-fit p-4 lg:sticky lg:top-24">
          <div className="mb-4 flex items-center gap-3 border-b border-gray-100 px-2 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-navy-700 to-navy-900 text-sm font-bold text-white shadow-sm shadow-navy-900/25">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">Hello, {user.name?.split(' ')[0]}</p>
              <p className="truncate text-xs text-gray-500">{user.email}</p>
            </div>
          </div>
          <nav className="space-y-1">
            {accountLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                aria-current={isActive(to) ? 'page' : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(to)
                    ? 'bg-navy-50 text-navy-700'
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
