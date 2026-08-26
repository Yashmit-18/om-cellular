import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { settingsService } from '../../services/settings.service'

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    settingsService.getSettings().then(r => {
      if (r.success && r.data) {
        const map: Record<string, string> = {}
        r.data.forEach((s: any) => { map[s.key] = s.value })
        setSettings(map)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await settingsService.updateSettings(settings)
      toast.success('Settings saved')
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  const fields = [
    { key: 'business_name', label: 'Business Name' },
    { key: 'business_phone', label: 'Business Phone' },
    { key: 'business_email', label: 'Business Email' },
    { key: 'business_address', label: 'Business Address' },
    { key: 'footer_about', label: 'Footer About Text' },
    { key: 'whatsapp_number', label: 'WhatsApp Number' },
    { key: 'facebook_url', label: 'Facebook URL' },
    { key: 'instagram_url', label: 'Instagram URL' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <div className="mt-6 card p-6 space-y-4">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700">{f.label}</label>
            <input value={settings[f.key] || ''} onChange={e => setSettings({ ...settings, [f.key]: e.target.value })} className="input mt-1" />
          </div>
        ))}
        <button onClick={handleSave} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  )
}
