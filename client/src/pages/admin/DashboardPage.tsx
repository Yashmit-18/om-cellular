import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, Users, DollarSign, TrendingUp, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { analyticsService } from '../../services/analytics.service'
import { formatPrice, formatDate } from '../../utils'
import { ORDER_STATUS_COLORS } from '../../constants'
import type { DashboardStats } from '../../types'

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [salesData, setSalesData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const [statsRes, analyticsRes] = await Promise.allSettled([
          api.get('/analytics/dashboard'),
          api.get('/analytics/sales-chart?period=7days'),
        ])
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data.data)
        if (analyticsRes.status === 'fulfilled') setSalesData(analyticsRes.value.data.data || [])
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    )
  }

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(stats?.totalRevenue || 0), icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'Total Orders', value: stats?.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500' },
    { label: 'Total Products', value: stats?.totalProducts || 0, icon: Package, color: 'bg-purple-500' },
    { label: 'Total Customers', value: stats?.totalUsers || 0, icon: Users, color: 'bg-amber-500' },
    { label: 'Pending Orders', value: stats?.pendingOrders || 0, icon: Clock, color: 'bg-orange-500' },
    { label: 'Pending Repairs', value: stats?.pendingRepairs || 0, icon: TrendingUp, color: 'bg-red-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map(card => (
          <div key={card.label} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold">{card.value}</p>
              </div>
              <div className={`rounded-xl p-3 ${card.color}`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      {salesData.length > 0 && (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-semibold">Sales Overview (Last 7 Days)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatPrice(value)} />
                <Bar dataKey="revenue" fill="#3b5bdb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {stats?.recentOrders && stats.recentOrders.length > 0 && (
        <div className="mt-6 card p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Orders</h2>
            <Link to="/admin/orders" className="text-sm font-medium text-brand-600 hover:text-brand-700">View All</Link>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="pb-3 pr-4 font-medium">Order #</th>
                  <th className="pb-3 pr-4 font-medium">Customer</th>
                  <th className="pb-3 pr-4 font-medium">Total</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map(order => (
                  <tr key={order.id} className="border-b last:border-0">
                    <td className="py-3 pr-4">
                      <Link to={`/admin/orders/${order.id}`} className="font-medium text-brand-600 hover:text-brand-700">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-gray-600">{order.user?.name || 'Guest'}</td>
                    <td className="py-3 pr-4 font-medium">{formatPrice(order.total)}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${ORDER_STATUS_COLORS[order.status] || 'badge-info'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
