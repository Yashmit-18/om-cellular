import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Package, Wrench, Smartphone, ArrowRightLeft } from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import api from '../../services/api'
import { formatDate } from '../../utils'

export default function AccountDashboardPage() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<any>({ orders: 0, repairs: 0, sellRequests: 0, exchangeRequests: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.allSettled([
      api.get('/orders?limit=0'),
      api.get('/repairs?limit=0'),
      api.get('/sell-requests?limit=0'),
      api.get('/exchange-requests?limit=0'),
    ]).then(results => {
      setStats({
        orders: results[0].status === 'fulfilled' ? (results[0] as any).value.data.pagination?.total || 0 : 0,
        repairs: results[1].status === 'fulfilled' ? (results[1] as any).value.data.pagination?.total || 0 : 0,
        sellRequests: results[2].status === 'fulfilled' ? (results[2] as any).value.data.pagination?.total || 0 : 0,
        exchangeRequests: results[3].status === 'fulfilled' ? (results[3] as any).value.data.pagination?.total || 0 : 0,
      })
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div></div>

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {user?.name || 'User'}</h1>
      <p className="mt-1 text-sm text-gray-500">{user?.email}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Orders', value: stats.orders, icon: Package, to: '/account/orders', color: 'bg-blue-500' },
          { label: 'Repairs', value: stats.repairs, icon: Wrench, to: '/account/repairs', color: 'bg-purple-500' },
          { label: 'Sell Requests', value: stats.sellRequests, icon: Smartphone, to: '/account/sell-requests', color: 'bg-emerald-500' },
          { label: 'Exchange Requests', value: stats.exchangeRequests, icon: ArrowRightLeft, to: '/account/exchange-requests', color: 'bg-amber-500' },
        ].map(card => (
          <Link key={card.label} to={card.to} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${card.color}`}><card.icon className="h-5 w-5 text-white" /></div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
