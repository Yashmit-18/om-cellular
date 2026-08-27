import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, Users, DollarSign, TrendingUp, Clock, Smartphone, ArrowRightLeft, Wrench, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import api from '../../services/api'
import { formatPrice } from '../../utils'

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/analytics').then(r => {
      setStats(r.data.data)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" /></div>

  if (!stats) return <div className="text-center py-12 text-gray-500">Failed to load dashboard data</div>

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(stats.totalSales || 0), icon: DollarSign, color: 'bg-emerald-500', sub: `Today: ${formatPrice(stats.todaySales || 0)}` },
    { label: 'Total Orders', value: stats.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500', sub: `${stats.pendingOrders || 0} pending` },
    { label: 'Products', value: stats.totalProducts || 0, icon: Package, color: 'bg-purple-500', sub: `${stats.activeProducts || 0} active` },
    { label: 'Customers', value: stats.totalCustomers || 0, icon: Users, color: 'bg-amber-500', sub: '' },
    { label: 'Pending Repairs', value: stats.pendingRepairs || 0, icon: Wrench, color: 'bg-orange-500', sub: `${stats.totalRepairs || 0} total` },
    { label: 'Sell Requests', value: stats.pendingSellRequests || 0, icon: Smartphone, color: 'bg-cyan-500', sub: `${stats.totalSellRequests || 0} total` },
    { label: 'Exchange Requests', value: stats.pendingExchangeRequests || 0, icon: ArrowRightLeft, color: 'bg-pink-500', sub: `${stats.totalExchangeRequests || 0} total` },
    { label: 'Low Stock', value: stats.lowStockProducts || 0, icon: AlertTriangle, color: 'bg-red-500', sub: 'Products need attention' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <Link key={card.label} to={
            card.label.includes('Order') ? '/admin/orders' :
            card.label.includes('Repair') ? '/admin/repairs' :
            card.label.includes('Sell') ? '/admin/sell-requests' :
            card.label.includes('Exchange') ? '/admin/exchange-requests' :
            card.label.includes('Product') ? '/admin/products' :
            card.label.includes('Customer') ? '/admin/customers' :
            card.label.includes('Low Stock') ? '/admin/inventory' :
            '#'
          } className="card-premium p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                {card.sub && <p className="mt-0.5 text-xs text-gray-400">{card.sub}</p>}
              </div>
              <div className={`rounded-xl p-3 ${card.color}`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {stats.salesChart && stats.salesChart.length > 0 && (
        <div className="mt-6 card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Sales Overview (Last 7 Days)</h2>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.salesChart.map((d: any) => ({ date: d._id?.slice(5) || d.date, revenue: d.sales || 0, orders: d.orders || 0 }))}>
                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value: number) => formatPrice(value)} />
                <Bar dataKey="revenue" fill="#4c6ef5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { to: '/admin/products', label: 'Manage Products', icon: Package },
              { to: '/admin/phone-catalog', label: 'Phone Catalog', icon: Smartphone },
              { to: '/admin/repair-services', label: 'Repair Services', icon: Wrench },
              { to: '/admin/sell-requests', label: 'Sell Requests', icon: DollarSign },
              { to: '/admin/banners', label: 'Banners', icon: ShoppingCart },
              { to: '/admin/settings', label: 'Settings', icon: Clock },
            ].map(action => (
              <Link key={action.to} to={action.to} className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:border-gray-300">
                <action.icon className="h-4 w-4 text-gray-400" />
                {action.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Pending Orders</span>
              <span className="font-semibold text-amber-600">{stats.pendingOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Delivered Orders</span>
              <span className="font-semibold text-emerald-600">{stats.deliveredOrders || 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Cancelled Orders</span>
              <span className="font-semibold text-red-600">{stats.cancelledOrders || 0}</span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Completed Repairs</span>
                <span className="font-semibold text-brand-600">{stats.completedRepairs || 0}</span>
              </div>
            </div>
          </div>
          <Link to="/admin/orders" className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700">
            View All Orders <TrendingUp className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
