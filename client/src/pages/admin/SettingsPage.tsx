import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { settingsService } from '../../services/settings.service'
import { Save } from 'lucide-react'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsService.getAllSettings().then(r => {
      const s = r.data
      if (Array.isArray(s)) {
        const map: Record<string, string> = {}
        s.forEach((item: any) => { map[item.key] = item.value })
        setSettings(map)
      } else if (typeof s === 'object') setSettings(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const settingsArray = Object.entries(settings).map(([key, value]) => ({ key, value: value || '' }))
      await settingsService.updateSettings({ settings: settingsArray } as any)
      toast.success('Settings saved successfully')
    } catch { toast.error('Failed to save settings') } finally { setSaving(false) }
  }

  const updateSetting = (key: string, value: string) => setSettings(prev => ({ ...prev, [key]: value }))

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  const groups = [
    {
      title: 'Business Information',
      settings: [
        { key: 'business_name', label: 'Business Name', placeholder: 'OM Cellular' },
        { key: 'business_phone', label: 'Phone Number', placeholder: '+91 98765 43210' },
        { key: 'business_email', label: 'Email Address', placeholder: 'info@omcellular.com', type: 'email' },
        { key: 'business_address', label: 'Business Address', placeholder: 'Store address', type: 'textarea' },
        { key: 'opening_hours', label: 'Opening Hours', placeholder: 'Mon-Sat: 10:00 AM - 8:00 PM' },
      ],
    },
    {
      title: 'WhatsApp',
      settings: [
        { key: 'whatsapp_number', label: 'WhatsApp Number', placeholder: '+919876543210' },
        { key: 'whatsapp_default_message', label: 'Default WhatsApp Message', placeholder: 'Hello OM Cellular, I need help...', type: 'textarea' },
      ],
    },
    {
      title: 'UPI / Online Payments',
      settings: [
        { key: 'upi_id', label: 'UPI ID', placeholder: 'yourstore@oksbi' },
        { key: 'upi_display_name', label: 'UPI Display Name', placeholder: 'OM Cellular' },
        { key: 'upi_qr_image', label: 'UPI QR Code Image URL', placeholder: 'https://...qr-code.png' },
      ],
    },
    {
      title: 'Google Maps',
      settings: [
        { key: 'google_maps_url', label: 'Google Maps Embed URL', placeholder: 'https://maps.google.com/maps?q=...&output=embed' },
        { key: 'google_maps_link', label: 'Google Maps Directions Link', placeholder: 'https://www.google.com/maps/search/?api=1&query=...' },
      ],
    },
    {
      title: 'Repair',
      settings: [
        { key: 'repair_pickup_drop_fee', label: 'Repair Pickup / Drop Fee (₹)', placeholder: '99' },
      ],
    },
    {
      title: 'Social Media',
      settings: [
        { key: 'facebook_url', label: 'Facebook URL', placeholder: 'https://facebook.com/...' },
        { key: 'instagram_url', label: 'Instagram URL', placeholder: 'https://instagram.com/...' },
      ],
    },
    {
      title: 'Footer',
      settings: [
        { key: 'footer_about', label: 'Footer About Text', placeholder: 'About your business...', type: 'textarea' },
      ],
    },
    {
      title: 'E-Commerce',
      settings: [
        { key: 'tax_rate', label: 'Tax Rate (decimal)', placeholder: '0.18 for 18%' },
        { key: 'free_shipping_threshold', label: 'Free Shipping Threshold (₹)', placeholder: '999' },
        { key: 'standard_shipping_price', label: 'Standard Shipping Price (₹)', placeholder: '99' },
      ],
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Business Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure your business information and store settings</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          <Save className="mr-2 h-4 w-4" /> {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>

      <div className="mt-8 space-y-8">
        {groups.map(group => (
          <div key={group.title} className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {group.settings.map(field => (
                <div key={field.key} className={field.type === 'textarea' ? 'sm:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700">{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea value={settings[field.key] || ''} onChange={e => updateSetting(field.key, e.target.value)}
                      className="input mt-1" rows={3} placeholder={field.placeholder} />
                  ) : (
                    <input type={field.type || 'text'} value={settings[field.key] || ''} onChange={e => updateSetting(field.key, e.target.value)}
                      className="input mt-1" placeholder={field.placeholder} />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
