import { AddressFieldsValue } from '../types'

interface AddressFieldsProps {
  value: AddressFieldsValue
  onChange: (next: AddressFieldsValue) => void
  showAlternatePhone?: boolean
  showLandmark?: boolean
  disabled?: boolean
}

export default function AddressFields({
  value,
  onChange,
  showAlternatePhone = true,
  showLandmark = true,
  disabled = false,
}: AddressFieldsProps) {
  const set = (key: keyof AddressFieldsValue, val: string) => onChange({ ...value, [key]: val })

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-gray-700">Full Name *</label>
        <input value={value.name} onChange={e => set('name', e.target.value)} disabled={disabled} className="input mt-1" placeholder="Recipient name" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Phone Number *</label>
        <input value={value.phone} onChange={e => set('phone', e.target.value)} disabled={disabled} inputMode="tel" className="input mt-1" placeholder="10-digit mobile number" />
      </div>

      {showAlternatePhone && (
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Alternate Phone <span className="font-normal text-gray-400">(optional)</span></label>
          <input value={value.alternatePhone || ''} onChange={e => set('alternatePhone', e.target.value)} disabled={disabled} inputMode="tel" className="input mt-1" placeholder="Another contact number (optional)" />
        </div>
      )}

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
        <input value={value.addressLine1} onChange={e => set('addressLine1', e.target.value)} disabled={disabled} className="input mt-1" placeholder="House number, street, area" />
      </div>

      <div className="sm:col-span-2">
        <label className="block text-sm font-medium text-gray-700">Address Line 2</label>
        <input value={value.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} disabled={disabled} className="input mt-1" placeholder="Building or area (optional)" />
      </div>

      {showLandmark && (
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">Landmark <span className="font-normal text-gray-400">(optional)</span></label>
          <input value={value.landmark || ''} onChange={e => set('landmark', e.target.value)} disabled={disabled} className="input mt-1" placeholder="Nearby landmark (optional)" />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">City *</label>
        <input value={value.city} onChange={e => set('city', e.target.value)} disabled={disabled} className="input mt-1" placeholder="City" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">State *</label>
        <input value={value.state} onChange={e => set('state', e.target.value)} disabled={disabled} className="input mt-1" placeholder="State" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">PIN Code *</label>
        <input value={value.pincode} onChange={e => set('pincode', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} disabled={disabled} inputMode="numeric" className="input mt-1" placeholder="6-digit PIN code" />
      </div>
    </div>
  )
}