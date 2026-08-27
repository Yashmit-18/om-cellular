import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, Clock, MessageCircle, ExternalLink } from 'lucide-react'
import { settingsService } from '../../services/settings.service'

export default function Footer() {
  const [settings, setSettings] = useState<Record<string, string>>({})

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
  const whatsAppUrl = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}` : ''

  return (
    <footer className="border-t border-gray-200 bg-navy-950 text-gray-400">
      <div className="container-custom py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-white tracking-tight">{settings.business_name || 'OM Cellular'}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              {settings.footer_about || 'Your trusted partner for buying, selling, repairing and exchanging mobile phones.'}
            </p>
            <div className="mt-4 space-y-2.5 text-sm">
              {settings.business_phone && (
                <a href={`tel:${settings.business_phone}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <Phone className="h-4 w-4 shrink-0" /> {settings.business_phone}
                </a>
              )}
              {settings.business_email && (
                <a href={`mailto:${settings.business_email}`} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                  <Mail className="h-4 w-4 shrink-0" /> {settings.business_email}
                </a>
              )}
              {settings.business_address && (
                <div className="flex items-start gap-2 text-gray-400">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {settings.business_address}
                </div>
              )}
              {settings.opening_hours && (
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="h-4 w-4 shrink-0" /> {settings.opening_hours}
                </div>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Services</h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li><Link to="/buy-phones" className="hover:text-white transition-colors">Buy Phones</Link></li>
              <li><Link to="/sell-phone" className="hover:text-white transition-colors">Sell Phone</Link></li>
              <li><Link to="/repair" className="hover:text-white transition-colors">Repair Services</Link></li>
              <li><Link to="/exchange" className="hover:text-white transition-colors">Exchange Phone</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Support</h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/track-order" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/repair/track" className="hover:text-white transition-colors">Track Repair</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white">Account</h4>
            <ul className="mt-3 space-y-2.5 text-sm">
              <li><Link to="/account" className="hover:text-white transition-colors">My Account</Link></li>
              <li><Link to="/account/orders" className="hover:text-white transition-colors">My Orders</Link></li>
              <li><Link to="/account/repairs" className="hover:text-white transition-colors">My Repairs</Link></li>
              <li><Link to="/wishlist" className="hover:text-white transition-colors">Wishlist</Link></li>
            </ul>
          </div>
        </div>

        {(settings.facebook_url || settings.instagram_url || whatsAppUrl) && (
          <div className="mt-8 flex items-center gap-3">
            {whatsAppUrl && (
              <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gray-400 transition-all hover:bg-emerald-600 hover:text-white">
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            {settings.facebook_url && (
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gray-400 transition-all hover:bg-blue-600 hover:text-white">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
            {settings.instagram_url && (
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer" className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-gray-400 transition-all hover:bg-pink-600 hover:text-white">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-xs text-gray-500">
          &copy; {new Date().getFullYear()} {settings.business_name || 'OM Cellular'}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
