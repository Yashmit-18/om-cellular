import { useState } from 'react'
import { Smartphone, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import { sellRequestService } from '../../services/sellRequest.service'

export default function SellPhonePage() {
  const [form, setForm] = useState({
    brand: '', model: '', condition: 'GOOD', storage: '', ram: '', age: '',
    displayCondition: '', batteryCondition: '', cameraCondition: '', bodyCondition: '',
    accessoriesAvailable: false, originalBill: false, originalBox: false,
    pickupAddress: '', pickupDate: '', pickupTime: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.brand || !form.model || !form.storage) {
      toast.error('Please fill in brand, model, and storage')
      return
    }
    setLoading(true)
    try {
      await sellRequestService.createSellRequest(form)
      toast.success('Sell request submitted! We will evaluate your phone soon.')
      setForm({ brand: '', model: '', condition: 'GOOD', storage: '', ram: '', age: '', displayCondition: '', batteryCondition: '', cameraCondition: '', bodyCondition: '', accessoriesAvailable: false, originalBill: false, originalBox: false, pickupAddress: '', pickupDate: '', pickupTime: '' })
    } catch {
      toast.error('Failed to submit request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <Smartphone className="mx-auto h-12 w-12 text-brand-500" />
        <h1 className="mt-4 text-3xl font-bold">Sell Your Phone</h1>
        <p className="mt-2 text-gray-500">Get the best price for your used phone</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 card p-8 space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="block text-sm font-medium">Brand *</label><input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="input mt-1" placeholder="e.g. Apple" required /></div>
          <div><label className="block text-sm font-medium">Model *</label><input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="input mt-1" placeholder="e.g. iPhone 14" required /></div>
          <div><label className="block text-sm font-medium">Storage *</label><input value={form.storage} onChange={e => setForm({ ...form, storage: e.target.value })} className="input mt-1" placeholder="e.g. 128GB" required /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div><label className="block text-sm font-medium">RAM</label><input value={form.ram} onChange={e => setForm({ ...form, ram: e.target.value })} className="input mt-1" placeholder="e.g. 6GB" /></div>
          <div>
            <label className="block text-sm font-medium">Condition *</label>
            <select value={form.condition} onChange={e => setForm({ ...form, condition: e.target.value })} className="input mt-1">
              <option value="NEW">Brand New</option><option value="LIKE_NEW">Like New</option><option value="EXCELLENT">Excellent</option><option value="GOOD">Good</option><option value="FAIR">Fair</option>
            </select>
          </div>
          <div><label className="block text-sm font-medium">Age</label><input value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} className="input mt-1" placeholder="e.g. 1 year" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">Display Condition</label><input value={form.displayCondition} onChange={e => setForm({ ...form, displayCondition: e.target.value })} className="input mt-1" placeholder="Any scratches, cracks?" /></div>
          <div><label className="block text-sm font-medium">Battery Condition</label><input value={form.batteryCondition} onChange={e => setForm({ ...form, batteryCondition: e.target.value })} className="input mt-1" placeholder="Battery health?" /></div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">Camera Condition</label><input value={form.cameraCondition} onChange={e => setForm({ ...form, cameraCondition: e.target.value })} className="input mt-1" /></div>
          <div><label className="block text-sm font-medium">Body Condition</label><input value={form.bodyCondition} onChange={e => setForm({ ...form, bodyCondition: e.target.value })} className="input mt-1" /></div>
        </div>
        <div className="flex gap-6">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.accessoriesAvailable} onChange={e => setForm({ ...form, accessoriesAvailable: e.target.checked })} /> Accessories Available</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.originalBill} onChange={e => setForm({ ...form, originalBill: e.target.checked })} /> Original Bill</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.originalBox} onChange={e => setForm({ ...form, originalBox: e.target.checked })} /> Original Box</label>
        </div>
        <div><label className="block text-sm font-medium">Pickup Address</label><textarea value={form.pickupAddress} onChange={e => setForm({ ...form, pickupAddress: e.target.value })} className="input mt-1" rows={2} placeholder="Full address for pickup" /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="block text-sm font-medium">Preferred Pickup Date</label><input type="date" value={form.pickupDate} onChange={e => setForm({ ...form, pickupDate: e.target.value })} className="input mt-1" /></div>
          <div><label className="block text-sm font-medium">Preferred Pickup Time</label><input value={form.pickupTime} onChange={e => setForm({ ...form, pickupTime: e.target.value })} className="input mt-1" placeholder="e.g. 10AM-12PM" /></div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Submitting...' : 'Submit Sell Request'}</button>
      </form>
    </div>
  )
}
