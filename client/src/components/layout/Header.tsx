import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Search, Heart, ShoppingCart, User, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'

export default function Header() {
  const { user, logout } = useAuthStore()
  const getItemCount = useCartStore(s => s.getItemCount)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()

  const navLinks = [
    { to: '/products', label: 'Products' },
    { to: '/sell-phone', label: 'Sell Phone' },
    { to: '/repair', label: 'Repair' },
    { to: '/exchange', label: 'Exchange' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-xl font-bold text-brand-600">OM Cellular</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to} className="text-sm font-medium text-gray-600 hover:text-brand-600 transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/search')} className="p-2 text-gray-500 hover:text-gray-900">
            <Search className="h-5 w-5" />
          </button>
          <Link to="/wishlist" className="p-2 text-gray-500 hover:text-gray-900">
            <Heart className="h-5 w-5" />
          </Link>
          <Link to="/cart" className="relative p-2 text-gray-500 hover:text-gray-900">
            <ShoppingCart className="h-5 w-5" />
            {getItemCount() > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-xs text-white">
                {getItemCount()}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline">{user.name || 'Account'}</span>
                <ChevronDown className="h-4 w-4" />
              </button>
              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                    <Link to="/account" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                      My Account
                    </Link>
                    <Link to="/account/orders" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                      My Orders
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link to="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-50"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary !px-4 !py-2 text-sm">
              <User className="mr-2 h-4 w-4" /> Login
            </Link>
          )}

          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 text-gray-500 md:hidden">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-2 md:hidden">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className="block py-2.5 text-sm font-medium text-gray-600 hover:text-brand-600"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
