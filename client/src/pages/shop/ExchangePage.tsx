import { useState, useEffect } from 'react'
import { ArrowRightLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { exchangeRequestService } from '../../services/exchangeRequest.service'
import type { ProductWithVariant } from '../../types'

export default function ExchangePage() {
  const [products, setProducts] = useState<ProductWithVariant[]>([])
  const [form, setForm] = useState({
    oldBrand: '', oldModel: '', oldStorage: '', oldRam: '', oldCondition: 'GOOD', oldDeviceDetails: '',
    newVariantId: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/products?isActive=true&limit=100').then(r => setProducts(r.data.data || [])).catch(() => {})
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.oldBrand || !form.oldModel || !form.oldCondition) {
      toast.error('Please fill in the required fields')
      return
    }
    setLoading(true)
    try {
      await exchangeRequestService.createExchangeRequest(form)
      toast.success('Exchange request submitted!')
      setForm({ oldBrand: '', oldModel: '', oldStorage: '', oldRam: '', oldCondition: 'GOOD', oldDeviceDetails: '', newVariantId: '' })
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <ArrowRightLeft className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-3xl font-bold">Exchange Your Phone</h1>
        <p className="mt-2 text-gray-500">Trade in your old phone for a new one</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 card p-8 space-y-4">
        <h2 className="text-lg font-semibold">Your Old Phone</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="block text-sm font-medium">Brand *</label><input value={form.oldBrand} onChange={e => setForm({ ...form, oldBrand: e.target.value })} className="input mt-1" required /></div>
          <div><label className="block text-sm font-medium">Model *</label><input value={form.oldModel} onChange={e => setForm({ ...form, oldModel: e.target.value })} className="input mt-1" required /></div>
          <div><label className="block text-sm font-medium">Storage</label><input value={form.oldStorage} onChange={e => setForm({ ...form, oldStorage: e.target.value })} className="input mt-1" placeholder="e.g. 128GB" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">RAM</label><input value={form.oldRam} onChange={e => setForm({ ...form, oldRam: e.target.value })} className="input mt-1" /></div>
          <div>
            <label className="block text-sm font-medium">Condition *</label>
            <select value={form.oldCondition} onChange={e => setForm({ ...form, oldCondition: e.target.value })} className="input mt-1">
              <option value="NEW">Brand New</option><option value="LIKE_NEW">Like New</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="FAIR">Fair</option>
            </select>
          </div>
        </div>
        <div><label className="block text-sm font-medium">Device Details</label><textarea value={form.oldDeviceDetails} onChange={e => setForm({ ...form, oldDeviceDetails: e.target.value })} className="input mt-1" rows={3} placeholder="Any issues, scratches, etc." /></div>
        <h2 className="text-lg font-semibold pt-2">New Phone You Want</h2>
        <div>
          <label className="block text-sm font-medium">Select Product</label>
          <select value={form.newVariantId} onChange={e => setForm({ ...form, newVariantId: e.target.value })} className="input mt-1">
            <option value="">Browse products later...</option>
            {products.map(p => (
              <option key={p.id} value={p.variants?.[0]?.id || ''}>{p.name}</option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Submitting...' : 'Submit Exchange Request'}</button>
      </form>
    </div>
  )
}
