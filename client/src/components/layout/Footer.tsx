import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin } from 'lucide-react'
import { settingsService } from '../../services/settings.service'

export default function Footer() {
  const [settings, setSettings] = useState<Record<string, string>>({})

  useEffect(() => {
    settingsService.getSettings().then(r => {
      if (r.success && r.data) {
        const map: Record<string, string> = {}
        r.data.forEach((s: any) => { map[s.key] = s.value })
        setSettings(map)
      }
    }).catch(() => {})
  }, [])

  return (
    <footer className="border-t border-gray-200 bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-bold text-white">OM Cellular</h3>
            <p className="mt-2 text-sm text-gray-400">
              {settings.footer_about || 'Your trusted partner for buying, selling, repairing and exchanging mobile phones.'}
            </p>
            <div className="mt-4 space-y-2 text-sm">
              {settings.business_phone && (
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {settings.business_phone}</div>
              )}
              {settings.business_email && (
                <div className="flex items-center gap-2"><Mail className="h-4 w-4" /> {settings.business_email}</div>
              )}
              {settings.business_address && (
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {settings.business_address}</div>
              )}
            </div>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Shop</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/products" className="hover:text-white">All Products</Link></li>
              <li><Link to="/sell-phone" className="hover:text-white">Sell Phone</Link></li>
              <li><Link to="/repair" className="hover:text-white">Repair Services</Link></li>
              <li><Link to="/exchange" className="hover:text-white">Exchange</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Support</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/faq" className="hover:text-white">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-white">Contact Us</Link></li>
              <li><Link to="/track-order" className="hover:text-white">Track Order</Link></li>
              <li><Link to="/repair/track" className="hover:text-white">Track Repair</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Account</h4>
            <ul className="mt-3 space-y-2 text-sm">
              <li><Link to="/account" className="hover:text-white">My Account</Link></li>
              <li><Link to="/account/orders" className="hover:text-white">Orders</Link></li>
              <li><Link to="/wishlist" className="hover:text-white">Wishlist</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} {settings.business_name || 'OM Cellular'}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
