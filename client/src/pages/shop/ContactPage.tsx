import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, Send, MessageCircle, Clock, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import { contactRequestService } from '../../services/contactRequest.service'
import { settingsService } from '../../services/settings.service'
import { googleMapsSearchUrl } from '../../utils'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.message) { toast.error('Please fill in all required fields'); return }
    setLoading(true)
    try {
      await contactRequestService.createContactRequest(form)
      toast.success('Message sent! We will get back to you soon.')
      setForm({ name: '', email: '', phone: '', subject: '', message: '' })
    } catch { toast.error('Failed to send message') } finally { setLoading(false) }
  }

  const whatsAppNumber = settings.whatsapp_number || ''
  const whatsAppUrl = whatsAppNumber ? `https://wa.me/${whatsAppNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(settings.whatsapp_default_message || 'Hello OM Cellular, I need help.')}` : ''

  return (
    <div className="container-custom py-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Contact Us</h1>
        <p className="mt-2 text-gray-500">We&apos;d love to hear from you</p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {settings.business_phone && (
          <a href={`tel:${settings.business_phone}`} className="card-premium p-6 text-center transition-all hover:border-brand-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50"><Phone className="h-6 w-6 text-brand-600" /></div>
            <h3 className="mt-3 font-semibold text-gray-900">Call Us</h3>
            <p className="mt-1 text-sm text-gray-500">{settings.business_phone}</p>
          </a>
        )}
        {settings.business_email && (
          <a href={`mailto:${settings.business_email}`} className="card-premium p-6 text-center transition-all hover:border-brand-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50"><Mail className="h-6 w-6 text-brand-600" /></div>
            <h3 className="mt-3 font-semibold text-gray-900">Email Us</h3>
            <p className="mt-1 text-sm text-gray-500">{settings.business_email}</p>
          </a>
        )}
        {whatsAppUrl && (
          <a href={whatsAppUrl} target="_blank" rel="noopener noreferrer" className="card-premium p-6 text-center transition-all hover:border-emerald-200">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50"><MessageCircle className="h-6 w-6 text-emerald-600" /></div>
            <h3 className="mt-3 font-semibold text-gray-900">WhatsApp</h3>
            <p className="mt-1 text-sm text-gray-500">Chat with us</p>
          </a>
        )}
        {settings.business_address && (
          <div className="card-premium p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50"><MapPin className="h-6 w-6 text-brand-600" /></div>
            <h3 className="mt-3 font-semibold text-gray-900">Visit Us</h3>
            <p className="mt-1 text-sm text-gray-500">{settings.business_address}</p>
            <a href={settings.google_maps_link || googleMapsSearchUrl()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
              Get directions <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Business Hours */}
      {settings.opening_hours && (
        <div className="mt-8 card p-6 max-w-2xl mx-auto">
          <div className="flex items-center gap-2 text-gray-900">
            <Clock className="h-5 w-5 text-brand-600" />
            <h3 className="font-semibold">Business Hours</h3>
          </div>
          <p className="mt-2 text-sm text-gray-600">{settings.opening_hours}</p>
        </div>
      )}

      <div className="mt-10 grid gap-8 lg:grid-cols-2 max-w-5xl mx-auto">
        <div className="card p-8">
          <h2 className="text-xl font-bold text-gray-900">Send a Message</h2>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700">Name *</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" placeholder="Your name" required /></div>
              <div><label className="block text-sm font-medium text-gray-700">Email *</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input mt-1" placeholder="your@email.com" required /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label className="block text-sm font-medium text-gray-700">Phone</label><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input mt-1" placeholder="Your phone number" /></div>
              <div><label className="block text-sm font-medium text-gray-700">Subject</label><input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="input mt-1" placeholder="How can we help?" /></div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Message *</label><textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} className="input mt-1" rows={5} placeholder="Tell us about your inquiry..." required /></div>
            <button type="submit" disabled={loading} className="btn-primary">
              <Send className="mr-2 h-4 w-4" /> {loading ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </div>

        {settings.google_maps_url && (
          <div className="card overflow-hidden">
            <iframe src={settings.google_maps_url} width="100%" height="100%" style={{ border: 0, minHeight: '400px' }} allowFullScreen loading="lazy" title="Store Location" />
          </div>
        )}
      </div>
    </div>
  )
}
