import { useState } from 'react'
import { CheckCircle2, Loader2, MapPin, XCircle } from 'lucide-react'
import { serviceabilityService } from '../../services/serviceability.service'

export default function DeliveryServiceability() {
  const [pincode, setPincode] = useState('')
  const [status, setStatus] = useState<'idle' | 'checking' | 'serviceable' | 'unavailable' | 'unconfigured' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const check = async () => {
    const normalized = pincode.trim()
    if (!/^\d{6}$/.test(normalized)) {
      setStatus('error')
      setError('Enter a valid 6-digit PIN code')
      return
    }
    setStatus('checking')
    setError('')
    try {
      const response = await serviceabilityService.check(normalized, ['delivery'])
      const data = response.data
      setResult(data)
      if (!data.configured) setStatus('unconfigured')
      else setStatus(data.serviceable ? 'serviceable' : 'unavailable')
    } catch {
      setResult(null)
      setStatus('error')
      setError('Serviceability is temporarily unavailable. Please try again.')
    }
  }

  const message = status === 'serviceable'
    ? `Delivery available${result?.results?.delivery?.city ? ` in ${result.results.delivery.city}` : ''}.`
    : status === 'unavailable'
      ? 'Delivery is not currently available for this PIN code.'
      : status === 'unconfigured'
        ? 'Serviceability is currently being configured. Availability will be confirmed at checkout.'
        : status === 'error' ? error : ''

  return (
    <section aria-labelledby="delivery-check-heading" className="mt-6 rounded-2xl border border-gray-100 bg-ivory-100/70 p-4 sm:p-5">
      <div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-navy-700" aria-hidden="true" /><h2 id="delivery-check-heading" className="text-sm font-semibold text-gray-900">Check delivery availability</h2></div>
      <div className="mt-3 flex gap-2"><label htmlFor="product-delivery-pincode" className="sr-only">Delivery PIN code</label><input id="product-delivery-pincode" value={pincode} onChange={event => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={event => { if (event.key === 'Enter') check() }} inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="Enter 6-digit PIN" className="input min-h-[44px] flex-1" /><button type="button" onClick={check} disabled={status === 'checking'} className="btn-secondary min-h-[44px] shrink-0 !px-4">{status === 'checking' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Check'}</button></div>
      <p role="status" aria-live="polite" className={`mt-3 flex min-h-5 items-start gap-2 text-sm ${status === 'serviceable' ? 'text-emerald-700' : status === 'unavailable' || status === 'error' ? 'text-amber-700' : 'text-gray-500'}`}>{status === 'serviceable' && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}{status === 'unavailable' && <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}{message}</p>
    </section>
  )
}
