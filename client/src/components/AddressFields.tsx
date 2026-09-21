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
        <label htmlFor="addr-name" className="block text-sm font-medium text-gray-700">Full Name *</label>
        <input id="addr-name" value={value.name} onChange={e => set('name', e.target.value)} disabled={disabled} className="input mt-1" placeholder="Recipient name" autoComplete="name" />
      </div>
      <div>
        <label htmlFor="addr-phone" className="block text-sm font-medium text-gray-700">Phone Number *</label>
        <input id="addr-phone" value={value.phone} onChange={e => set('phone', e.target.value)} disabled={disabled} inputMode="tel" className="input mt-1" placeholder="10-digit mobile number" autoComplete="tel" />
      </div>

      {showAlternatePhone && (
        <div className="sm:col-span-2">
          <label htmlFor="addr-alt-phone" className="block text-sm font-medium text-gray-700">Alternate Phone <span className="font-normal text-gray-400">(optional)</span></label>
          <input id="addr-alt-phone" value={value.alternatePhone || ''} onChange={e => set('alternatePhone', e.target.value)} disabled={disabled} inputMode="tel" className="input mt-1" placeholder="Another contact number (optional)" />
        </div>
      )}

      <div className="sm:col-span-2">
        <label htmlFor="addr-line1" className="block text-sm font-medium text-gray-700">Address Line 1 *</label>
        <input id="addr-line1" value={value.addressLine1} onChange={e => set('addressLine1', e.target.value)} disabled={disabled} className="input mt-1" placeholder="House number, street, area" autoComplete="address-line1" />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="addr-line2" className="block text-sm font-medium text-gray-700">Address Line 2</label>
        <input id="addr-line2" value={value.addressLine2 || ''} onChange={e => set('addressLine2', e.target.value)} disabled={disabled} className="input mt-1" placeholder="Building or area (optional)" autoComplete="address-line2" />
      </div>

      {showLandmark && (
        <div className="sm:col-span-2">
          <label htmlFor="addr-landmark" className="block text-sm font-medium text-gray-700">Landmark <span className="font-normal text-gray-400">(optional)</span></label>
          <input id="addr-landmark" value={value.landmark || ''} onChange={e => set('landmark', e.target.value)} disabled={disabled} className="input mt-1" placeholder="Nearby landmark (optional)" />
        </div>
      )}

      <div>
        <label htmlFor="addr-city" className="block text-sm font-medium text-gray-700">City *</label>
        <input id="addr-city" value={value.city} onChange={e => set('city', e.target.value)} disabled={disabled} className="input mt-1" placeholder="City" autoComplete="address-level2" />
      </div>
      <div>
        <label htmlFor="addr-state" className="block text-sm font-medium text-gray-700">State *</label>
        <input id="addr-state" value={value.state} onChange={e => set('state', e.target.value)} disabled={disabled} className="input mt-1" placeholder="State" autoComplete="address-level1" />
      </div>
      <div>
        <label htmlFor="addr-pincode" className="block text-sm font-medium text-gray-700">PIN Code *</label>
        <input id="addr-pincode" value={value.pincode} onChange={e => set('pincode', e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} disabled={disabled} inputMode="numeric" className="input mt-1" placeholder="6-digit PIN code" autoComplete="postal-code" />
      </div>
    </div>
  )
}