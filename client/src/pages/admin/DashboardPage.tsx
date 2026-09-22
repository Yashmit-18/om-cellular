import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, Package, Users, DollarSign, TrendingUp, Clock, Smartphone, ArrowRightLeft, Wrench, AlertTriangle, MapPin, CreditCard, Star, Plus, Boxes } from 'lucide-react'
import api from '../../services/api'

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
    { label: 'Orders', value: stats.totalOrders || 0, icon: ShoppingCart, color: 'bg-blue-500', sub: `${stats.pendingOrders || 0} pending` },
    { label: 'Pending Payments', value: stats.pendingPayments || 0, icon: CreditCard, color: 'bg-amber-500', sub: `${stats.failedPayments || 0} failed` },
    { label: 'Active Variants', value: stats.inventory?.activeVariants || 0, icon: Boxes, color: 'bg-purple-500', sub: `${stats.inventory?.outOfStockVariants || 0} out of stock` },
    { label: 'Low Stock', value: stats.inventory?.lowStockVariants || 0, icon: AlertTriangle, color: 'bg-red-500', sub: 'Authoritative variant stock' },
    { label: 'Pending Reviews', value: stats.reviews?.pending || 0, icon: Star, color: 'bg-indigo-500', sub: `${stats.reviews?.approved || 0} approved` },
    { label: 'Pending Repairs', value: stats.pendingRepairs || 0, icon: Wrench, color: 'bg-orange-500', sub: `${stats.totalRepairs || 0} total` },
    { label: 'Sell Requests', value: stats.pendingSellRequests || 0, icon: Smartphone, color: 'bg-cyan-500', sub: `${stats.totalSellRequests || 0} total` },
    { label: 'Exchange Requests', value: stats.pendingExchangeRequests || 0, icon: ArrowRightLeft, color: 'bg-pink-500', sub: `${stats.totalExchangeRequests || 0} total` },
    { label: 'Customers', value: stats.totalCustomers || 0, icon: Users, color: 'bg-amber-500', sub: 'Registered customers' },
    { label: 'Service Areas', value: stats.serviceability?.enabledServiceAreas || 0, icon: MapPin, color: 'bg-indigo-500', sub: `${stats.serviceability?.inactiveServiceAreas || 0} inactive` },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {stats.serviceability?.legacyMode && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Serviceability is running in legacy mode</p>
            <p className="mt-0.5 text-xs text-amber-700">No service areas are enabled, so every PIN code is treated as serviceable. Configure service areas to enable pincode-based delivery and pickup availability.</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map(card => (
          <Link key={card.label} to={
            card.label.includes('Order') ? '/admin/orders' :
            card.label.includes('Repair') ? '/admin/repairs' :
            card.label.includes('Sell') ? '/admin/sell-requests' :
            card.label.includes('Exchange') ? '/admin/exchange-requests' :
            card.label.includes('Service Areas') ? '/admin/service-areas' :
            card.label.includes('Service Requests') ? '/admin/service-requests' :
            card.label.includes('Product') ? '/admin/products' :
            card.label.includes('Customer') ? '/admin/customers' :
            card.label.includes('Low Stock') ? '/admin/inventory' :
            card.label.includes('Payment') ? '/admin/orders' :
            card.label.includes('Review') ? '/admin/reviews' :
            '/admin'
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

      <section aria-labelledby="needs-attention-heading" className="mt-6 card p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 id="needs-attention-heading" className="text-lg font-semibold text-gray-900">Needs Attention</h2><p className="mt-1 text-sm text-gray-500">Live operational queues requiring an admin decision.</p></div><AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" /></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Pending payments', value: stats.pendingPayments || 0, to: '/admin/orders', icon: CreditCard },
            { label: 'Low stock variants', value: stats.inventory?.lowStockVariants || 0, to: '/admin/inventory', icon: AlertTriangle },
            { label: 'Pending reviews', value: stats.reviews?.pending || 0, to: '/admin/reviews', icon: Star },
            { label: 'Pending repairs', value: stats.pendingRepairs || 0, to: '/admin/repairs', icon: Wrench },
          ].filter(alert => alert.value > 0).map(alert => <Link key={alert.label} to={alert.to} className="flex min-h-[44px] items-center justify-between rounded-lg border border-gray-200 p-3 text-sm hover:border-brand-300 hover:bg-gray-50"><span className="flex items-center gap-2"><alert.icon className="h-4 w-4 text-brand-600" aria-hidden="true" />{alert.label}</span><strong>{alert.value}</strong></Link>)}
          {![stats.pendingPayments, stats.inventory?.lowStockVariants, stats.reviews?.pending, stats.pendingRepairs].some(value => value > 0) && <p className="text-sm text-gray-500">No operational alerts right now.</p>}
        </div>
      </section>


      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[
              { to: '/admin/products/new', label: 'Add Product', icon: Plus },
              { to: '/admin/products', label: 'Manage Products', icon: Package },
              { to: '/admin/inventory', label: 'Manage Inventory', icon: Boxes },
              { to: '/admin/orders', label: 'Manage Orders', icon: ShoppingCart },
              { to: '/admin/reviews', label: 'Review Moderation', icon: Star },
              { to: '/admin/service-areas', label: 'Service Areas', icon: MapPin },
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
