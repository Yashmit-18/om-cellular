import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Wrench, AlertCircle, Search } from 'lucide-react'
import { repairService } from '../../services/repair.service'
import { formatDate, formatPrice } from '../../utils'
import { REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS } from '../../constants'
import { storeAddressText, googleMapsSearchUrl } from '../../utils'
import StatusTimeline from '../../components/StatusTimeline'

export default function RepairTrackPage() {
  const [searchParams] = useSearchParams()
  const [bookingNumber, setBookingNumber] = useState(searchParams.get('booking') || '')
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleTrack = async (override?: string) => {
    const number = (override ?? bookingNumber).trim()
    if (!number) return
    setLoading(true)
    setErrorMsg(null)
    try {
      const res = await repairService.trackRepair(number)
      setResult(res.data || res.data?.data || res)
    } catch (err: any) {
      const status = err?.response?.status
      setErrorMsg(status === 404
        ? 'We couldn’t find a repair with that booking number. Double-check it and try again, or contact us for assistance.'
        : 'Something went wrong while tracking your repair. Please try again in a moment.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const booking = searchParams.get('booking')
    if (booking) {
      setBookingNumber(booking)
      handleTrack(booking)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div className="bg-gradient-to-b from-ivory-100/60 via-white to-white">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-navy-900/10 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-navy-800 shadow-sm">
            <Wrench className="h-3.5 w-3.5" /> Repair status
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-gray-900 md:text-4xl">Track Your Repair</h1>
          <p className="mt-2 text-gray-500">Enter your booking number to see live status updates</p>
        </div>

        <div className="card mt-8 p-6">
          <form onSubmit={e => { e.preventDefault(); handleTrack() }} className="flex gap-3">
            <input
              value={bookingNumber}
              onChange={e => { setBookingNumber(e.target.value); setResult(null); setErrorMsg(null) }}
              placeholder="Booking number"
              className="input flex-1"
              aria-label="Booking number"
            />
            <button type="submit" disabled={loading} className="btn-primary">
              <Search className="mr-1.5 h-4 w-4" />{loading ? 'Tracking...' : 'Track'}
            </button>
          </form>

          {errorMsg && (
            <div className="mt-6 rounded-xl border border-red-100 bg-red-50 p-4 text-center">
              <AlertCircle className="mx-auto h-7 w-7 text-red-500" />
              <p className="mt-2 text-sm font-medium text-gray-900">Repair not found</p>
              <p className="mt-0.5 text-xs text-gray-500">{errorMsg}</p>
              <button onClick={() => handleTrack()} className="btn-secondary mt-3 !py-2 text-sm">Try again</button>
            </div>
          )}

          {result && (
            <div className="animate-fade-in mt-6 space-y-4" aria-live="polite">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-500">Booking #</p>
                  <p className="font-bold">{result.bookingNumber}</p>
                </div>
                <span className={`badge ${REPAIR_STATUS_COLORS[result.status] || 'badge-info'}`}>{REPAIR_STATUS_LABELS[result.status] || result.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 text-sm sm:grid-cols-4">
                <div><p className="text-gray-500">Device</p><p className="mt-0.5 font-medium">{result.brand} {result.model}</p></div>
                <div><p className="text-gray-500">Created</p><p className="mt-0.5 font-medium">{formatDate(result.createdAt)}</p></div>
                {result.estimatedCost ? <div><p className="text-gray-500">Estimated Cost</p><p className="mt-0.5 font-medium">{formatPrice(result.estimatedCost)}</p></div> : null}
                {result.pickupFee > 0 && <div><p className="text-gray-500">Pickup Fee</p><p className="mt-0.5 font-medium">{formatPrice(result.pickupFee)}</p></div>}
                <div><p className="text-gray-500">Service Mode</p><p className="mt-0.5 font-medium capitalize">{result.serviceMode === 'DOORSTEP_PICKUP' ? 'Doorstep Pickup' : 'Store Drop-off'}</p></div>
              </div>
              {result.serviceMode === 'STORE_DROP' && (
                <p className="rounded-lg bg-navy-50 p-3 text-xs text-gray-600">Drop-off location: {storeAddressText()}. <a href={googleMapsSearchUrl()} target="_blank" rel="noopener noreferrer" className="font-medium text-navy-800">Get directions</a></p>
              )}
              {result.statusHistory && result.statusHistory.length > 0 && (
                <div>
                  <h3 className="mt-4 text-sm font-semibold">Status History</h3>
                  <div className="mt-3 rounded-xl border border-gray-100 p-4">
                    <StatusTimeline history={result.statusHistory} labels={REPAIR_STATUS_LABELS} colors={REPAIR_STATUS_COLORS} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}