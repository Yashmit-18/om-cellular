import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Home, ShoppingCart, User, ChevronDown, Search, Store, Wrench, Smartphone } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useCartStore } from '../../stores/cartStore'
import { settingsService } from '../../services/settings.service'
import SearchPanel from '../search/SearchPanel'

const mobileNav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/buy-phones', label: 'Buy Phones', icon: Store },
  { to: '/sell-phone', label: 'Sell', icon: Smartphone },
  { to: '/repair', label: 'Repair', icon: Wrench },
  { to: '/account', label: 'Account', icon: User },
]

export default function Header() {
  const { user, logout } = useAuthStore()
  const getItemCount = useCartStore(s => s.getItemCount)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [settings, setSettings] = useState<Record<string, string>>({})
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    settingsService.getSettings().then(r => {
      const s = r.data
      const map: Record<string, string> = {}
      if (Array.isArray(s)) s.forEach((item: any) => { map[item.key] = item.value })
      else if (typeof s === 'object') Object.assign(map, s)
      setSettings(map)
    }).catch(() => {})
  }, [])

  const whatsAppNumber = settings.whatsapp_number || ''
  const whatsAppUrl = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hello OM Cellular, I need help with a mobile phone.')}` : ''

  const navLinks = [
    { to: '/buy-phones', label: 'Buy Phones' },
    { to: '/sell-phone', label: 'Sell Phone' },
    { to: '/repair', label: 'Repair' },
    { to: '/exchange', label: 'Exchange' },
  ]

  return (
    <>
      <header className="sticky top-0 z-[60] border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container-custom">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-base font-black text-white">OM</span>
              <span className="hidden text-lg font-bold tracking-tight text-brand-700 sm:inline">OM Cellular</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(link => (
                <Link key={link.to} to={link.to} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1">
              <SearchPanel />

              <Link to="/cart" className="relative rounded-full p-2.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900" aria-label="Cart">
                <ShoppingCart className="h-5 w-5" />
                {getItemCount() > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {getItemCount()}
                  </span>
                )}
              </Link>

              {whatsAppUrl && (
                <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="hidden sm:flex rounded-full p-2.5 text-emerald-600 transition-colors hover:bg-emerald-50" aria-label="Chat on WhatsApp">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              )}

              {user ? (
                <div className="relative">
                  <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-600">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <ChevronDown className="hidden h-4 w-4 sm:inline" />
                  </button>
                  {userMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                      <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                        <div className="border-b border-gray-100 px-4 py-3">
                          <p className="truncate text-sm font-medium text-gray-900">{user.name}</p>
                          <p className="truncate text-xs text-gray-500">{user.email}</p>
                        </div>
                        <Link to="/account" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>My Account</Link>
                        <Link to="/account/orders" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>My Orders</Link>
                        <Link to="/account/sell-requests" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Sell Requests</Link>
                        <Link to="/account/repairs" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>My Repairs</Link>
                        {user.role === 'ADMIN' && (
                          <>
                            <div className="my-1 border-t border-gray-100" />
                            <Link to="/admin" className="block px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>Admin Panel</Link>
                          </>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                          className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Logout</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <Link to="/login" className="btn-primary hidden !px-4 !py-2 text-sm sm:inline-flex">
                  <User className="mr-1.5 h-4 w-4" /> Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white pb-safe md:hidden" aria-label="Main navigation">
        <div className="flex items-stretch justify-around">
          {mobileNav.map(item => {
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)
            const Icon = item.icon
            return (
              <Link key={item.to} to={item.to}
                className={`flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium ${active ? 'text-brand-600' : 'text-gray-500'}`}>
                <Icon className={`h-6 w-6 ${active ? 'text-brand-600' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
