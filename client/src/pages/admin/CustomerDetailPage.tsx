import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronRight, MapPin } from 'lucide-react'
import api from '../../services/api'
import { formatDate, formatPrice } from '../../utils'
import { ORDER_STATUS_LABELS, ORDER_STATUS_COLORS, REPAIR_STATUS_LABELS, REPAIR_STATUS_COLORS, REQUEST_STATUS_LABELS, REQUEST_STATUS_COLORS } from '../../constants'

export default function AdminCustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [customer, setCustomer] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    api.get(`/customers/${id}`).then(r => { setCustomer(r.data.data); setLoading(false) }).catch(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>
  if (!customer) return <div className="text-center py-12">Customer not found</div>

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to="/admin/customers" className="hover:text-gray-900">Customers</Link><ChevronRight className="h-3 w-3" /><span className="text-gray-900">{customer.name}</span>
      </nav>
      <h1 className="text-2xl font-bold">{customer.name}</h1>
      <p className="mt-1 text-sm text-gray-500">{customer.email} · {customer.phone}{customer.alternatePhone ? ` · alt ${customer.alternatePhone}` : ''}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Orders', value: customer.metrics?.orderCount },
          { label: 'Total Spent', value: formatPrice(customer.metrics?.totalSpent) },
          { label: 'Repairs', value: customer.metrics?.repairCount },
          { label: 'Sell Requests', value: customer.metrics?.sellCount },
        ].map(card => (
          <div key={card.label} className="card p-5"><p className="text-sm text-gray-500">{card.label}</p><p className="mt-1 text-2xl font-bold">{card.value}</p></div>
        ))}
      </div>

      <div className="mt-6 card p-6">
        <h2 className="font-semibold mb-3">Addresses</h2>
        {customer.addresses?.length === 0 ? <p className="text-sm text-gray-400">No saved addresses.</p> : (
          <div className="space-y-3">
            {customer.addresses?.map((addr: any) => (
              <div key={addr.id || addr._id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <p className="font-medium">{addr.name} - {addr.phone}{addr.isDefault && <span className="badge badge-success ml-1">Default</span>}</p>
                <p className="text-gray-600 mt-0.5"><MapPin className="mr-1 inline h-3.5 w-3.5" />{addr.addressLine1}, {addr.city}, {addr.state} - {addr.pincode}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Orders ({customer.orders?.length || 0})</h2>
          <div className="space-y-2">
            {customer.orders?.map((o: any) => (
              <Link key={o.id || o._id} to={`/admin/orders/${o.id || o._id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50">
                <div><p className="font-medium">{o.orderNumber}</p><p className="text-gray-500">{formatDate(o.createdAt)}</p></div>
                <span className={`badge ${ORDER_STATUS_COLORS[o.status]}`}>{ORDER_STATUS_LABELS[o.status] || o.status}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h2 className="font-semibold mb-3">Repairs ({customer.repairs?.length || 0})</h2>
          <div className="space-y-2">
            {customer.repairs?.map((r: any) => (
              <Link key={r.id || r._id} to={`/admin/repairs/${r.id || r._id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50">
                <div><p className="font-medium">{r.bookingNumber}</p><p className="text-gray-500">{r.brand} {r.model}</p></div>
                <span className={`badge ${REPAIR_STATUS_COLORS[r.status]}`}>{REPAIR_STATUS_LABELS[r.status] || r.status}</span>
              </Link>
            ))}
          </div>
          <h2 className="font-semibold mt-6 mb-3">Sell Requests ({customer.sellRequests?.length || 0})</h2>
          <div className="space-y-2">
            {customer.sellRequests?.map((s: any) => (
              <Link key={s.id || s._id} to={`/admin/sell-requests/${s.id || s._id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50">
                <div><p className="font-medium">{s.requestNumber}</p><p className="text-gray-500">{s.brand} {s.model}</p></div>
                <span className={`badge ${REQUEST_STATUS_COLORS[s.status]}`}>{REQUEST_STATUS_LABELS[s.status] || s.status}</span>
              </Link>
            ))}
          </div>
          <h2 className="font-semibold mt-6 mb-3">Exchange Requests ({customer.exchangeRequests?.length || 0})</h2>
          <div className="space-y-2">
            {customer.exchangeRequests?.map((e: any) => (
              <Link key={e.id || e._id} to={`/admin/exchange-requests/${e.id || e._id}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3 text-sm hover:bg-gray-50">
                <div><p className="font-medium">{e.requestNumber}</p><p className="text-gray-500">{e.oldBrand} {e.oldModel}</p></div>
                <span className={`badge ${REQUEST_STATUS_COLORS[e.status]}`}>{REQUEST_STATUS_LABELS[e.status] || e.status}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}