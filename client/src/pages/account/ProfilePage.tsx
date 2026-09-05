import { useEffect, useState } from 'react'
import { User as UserIcon, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { useAuthStore } from '../../stores/authStore'
import AddressFields from '../../components/AddressFields'
import { AddressFieldsValue } from '../../types'

interface ProfileData {
  name: string
  email: string
  alternatePhone: string
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [form, setForm] = useState<ProfileData>({ name: '', email: '', alternatePhone: '' })
  const [addresses, setAddresses] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [addressForm, setAddressForm] = useState<AddressFieldsValue>({
    name: '', phone: '', alternatePhone: '', addressLine1: '', addressLine2: '', landmark: '', city: '', state: '', pincode: '',
  })
  const [savingAddress, setSavingAddress] = useState(false)

  useEffect(() => {
    api.get('/auth/me').then(r => {
      const data = r.data.data
      setForm({
        name: data.name || '',
        email: data.email || '',
        alternatePhone: data.alternatePhone || '',
      })
      setAddresses(data.addresses || [])
      setUser(data)
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    if (form.name.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    setSaving(true)
    try {
      const payload: any = { name: form.name.trim(), email: form.email.trim() || null, alternatePhone: form.alternatePhone.trim() || null }
      const res = await api.put('/auth/me', payload)
      setUser(res.data.data)
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update profile')
    } finally {
      setSaving(false)
    }
  }

  const pushAddress = (addr: any) => {
    setAddresses(prev => [addr, ...prev.filter(a => a.id !== addr.id)])
  }

  const handleSaveAddress = async () => {
    if (!addressForm.name.trim() || !addressForm.phone.trim() || !addressForm.addressLine1.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !/^\d{6}$/.test(addressForm.pincode.trim())) {
      toast.error('Please fill all required address fields')
      return
    }
    setSavingAddress(true)
    try {
      const res = await api.post('/addresses', addressForm)
      pushAddress(res.data.data)
      setAddressForm({ name: '', phone: '', alternatePhone: '', addressLine1: '', addressLine2: '', landmark: '', city: '', state: '', pincode: '' })
      toast.success('Address added')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not save address')
    } finally {
      setSavingAddress(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    try {
      const res = await api.patch(`/addresses/${id}/default`)
      setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === id })))
      toast.success('Default address updated')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not update default address')
    }
  }

  const handleDeleteAddress = async (id: string) => {
    if (!window.confirm('Delete this address?')) return
    try {
      await api.delete(`/addresses/${id}`)
      setAddresses(prev => prev.filter(a => a.id !== id))
      toast.success('Address deleted')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not delete address')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <UserIcon className="h-5 w-5 text-brand-500" />
        <h1 className="text-2xl font-bold">My Profile</h1>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Personal Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full Name *</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input mt-1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input mt-1" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input value={user?.phone || ''} disabled className="input mt-1 bg-gray-50" />
            <p className="mt-1 text-xs text-gray-400">Phone number cannot be changed.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Alternate Phone <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={form.alternatePhone} onChange={e => setForm({ ...form, alternatePhone: e.target.value.replace(/[^0-9+ ]/g, '').slice(0, 15) })} inputMode="tel" className="input mt-1" placeholder="10-digit mobile number" />
          </div>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary mt-4">
          <Save className="mr-1 inline h-4 w-4" /> {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Saved Addresses</h2>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-400">No saved addresses yet. Add one below for faster checkout.</p>
        ) : (
          <div className="space-y-3">
            {addresses.map((addr: any) => (
              <div key={addr.id} className="flex items-start justify-between rounded-lg border border-gray-200 p-4">
                <div className="text-sm">
                  <p className="font-medium">{addr.name} - {addr.phone} {addr.isDefault && <span className="badge badge-success ml-1">Default</span>}</p>
                  {addr.alternatePhone && <p className="text-gray-500">Alt: {addr.alternatePhone}</p>}
                  <p className="text-gray-600">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ''}{addr.landmark ? ` (${addr.landmark})` : ''}</p>
                  <p className="text-gray-600">{addr.city}, {addr.state} - {addr.pincode}</p>
                </div>
                <div className="flex flex-col gap-1.5 text-xs">
                  {!addr.isDefault && (
                    <button onClick={() => handleSetDefault(addr.id)} className="font-medium text-brand-600 hover:text-brand-700">Set Default</button>
                  )}
                  <button onClick={() => handleDeleteAddress(addr.id)} className="font-medium text-red-500 hover:text-red-600">Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 rounded-xl border border-dashed border-gray-300 p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Add New Address</h3>
          <AddressFields value={addressForm} onChange={setAddressForm} />
          <button onClick={handleSaveAddress} disabled={savingAddress} className="btn-primary mt-4">
            {savingAddress ? 'Saving…' : 'Save Address'}
          </button>
        </div>
      </div>
    </div>
  )
}