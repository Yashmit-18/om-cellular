import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import ScrollProgress from '../components/layout/ScrollProgress'
import { settingsService } from '../services/settings.service'

export default function ShopLayout() {
  const { fetchUser } = useAuthStore()
  const location = useLocation()
  const [whatsAppUrl, setWhatsAppUrl] = useState('')

  useEffect(() => { fetchUser() }, [fetchUser])

  useEffect(() => {
    settingsService.getSettings().then(r => {
      const s = r.data
      let map: Record<string, string> = {}
      if (Array.isArray(s)) { s.forEach((item: any) => { map[item.key] = item.value }) }
      else if (typeof s === 'object') map = s
      const num = map.whatsapp_number || ''
      const msg = map.whatsapp_default_message || 'Hello OM Cellular, I need help with a mobile phone.'
      if (num) setWhatsAppUrl(`https://wa.me/${num.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`)
    }).catch(() => {})
  }, [])

return (
    <div className="flex min-h-screen flex-col">
      <ScrollProgress />
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
{/* Hide the FAB on product detail / cart / checkout pages so it cannot
          overlap the sticky mobile buy bar or the checkout summary */}
      {whatsAppUrl &&
        !location.pathname.startsWith('/products/') &&
        !location.pathname.startsWith('/cart') &&
        !location.pathname.startsWith('/checkout') && (
        <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer"
          className="animate-fab-in fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-elevated ring-4 ring-white/70 border border-black/10 transition-colors duration-300 hover:bg-emerald-700 md:bottom-6 md:right-6"
          aria-label="Chat on WhatsApp">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
      {/* Spacer matching fixed mobile bottom nav height (+ notch safe area) */}
      <div className="h-[calc(5rem+env(safe-area-inset-bottom))] md:hidden" aria-hidden="true" />
    </div>
  )
}
