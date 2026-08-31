import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { useAuthStore } from '../stores/authStore'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import { settingsService } from '../services/settings.service'

export default function ShopLayout() {
  const { fetchUser } = useAuthStore()
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
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      {whatsAppUrl && (
        <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer"
          className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg transition-all duration-300 hover:bg-emerald-600 hover:shadow-xl hover:scale-110 md:bottom-6 md:right-6"
          aria-label="Chat on WhatsApp">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
      {/* Spacer matching fixed mobile bottom nav height */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </div>
  )
}
