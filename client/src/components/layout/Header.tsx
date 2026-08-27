import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Menu, X, Search, Heart, ShoppingCart, User, ChevronDown, MessageCircle } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { settingsService } from '../../services/settings.service'

export default function Header() {
  const { user, logout } = useAuthStore()
  const getItemCount = useCartStore(s => s.getItemCount)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const navigate = useNavigate()

  useEffect(() => {
    settingsService.getSettings().then(r => {
      const s = r.data
      if (Array.isArray(s)) {
        const map: Record<string, string> = {}
        s.forEach((item: any) => { map[item.key] = item.value })
        setSettings(map)
      } else if (typeof s === 'object') setSettings(s)
    }).catch(() => {})
  }, [])

  const whatsAppNumber = settings.whatsapp_number || ''
  const whatsAppUrl = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello OM Cellular, I need help with a mobile phone.')}` : ''

  const navLinks = [
    { to: '/products', label: 'Products' },
    { to: '/sell-phone', label: 'Sell Phone' },
    { to: '/repair', label: 'Repair' },
    { to: '/exchange', label: 'Exchange' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
      <div className="container-custom">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-brand-700">OM Cellular</span>
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => navigate('/search')} className="rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <Search className="h-5 w-5" />
            </button>
            <Link to="/wishlist" className="hidden sm:flex rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <Heart className="h-5 w-5" />
            </Link>
            <Link to="/cart" className="relative rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900">
              <ShoppingCart className="h-5 w-5" />
              {getItemCount() > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {getItemCount()}
                </span>
              )}
            </Link>

            {whatsAppUrl && (
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:flex rounded-lg p-2.5 text-emerald-600 transition-colors hover:bg-emerald-50">
                <MessageCircle className="h-5 w-5" />
              </a>
            )}

            {user ? (
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate">{user.name || 'Account'}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                      <div className="border-b border-gray-100 px-4 py-3">
                        <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link to="/account" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>My Account</Link>
                      <Link to="/account/orders" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>My Orders</Link>
                      <Link to="/account/sell-requests" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Sell Requests</Link>
                      <Link to="/account/repairs" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>My Repairs</Link>
                      {user.role === 'ADMIN' && (
                        <>
                          <div className="border-t border-gray-100 my-1" />
                          <Link to="/admin" className="block px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Admin Panel</Link>
                        </>
                      )}
                      <div className="border-t border-gray-100 my-1" />
                      <button onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Logout</button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn-primary !px-4 !py-2 text-sm">
                <User className="mr-1.5 h-4 w-4" /> Login
              </Link>
            )}

            <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2.5 text-gray-500 md:hidden">
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-gray-200 py-3 md:hidden">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            ))}
            <Link to="/wishlist" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50" onClick={() => setMobileOpen(false)}>Wishlist</Link>
            {whatsAppUrl && (
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-emerald-600 hover:bg-emerald-50" onClick={() => setMobileOpen(false)}>
                <MessageCircle className="inline h-4 w-4 mr-1" /> WhatsApp
              </a>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
