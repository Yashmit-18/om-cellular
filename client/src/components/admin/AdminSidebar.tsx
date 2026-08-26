import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wrench, Smartphone, ArrowRightLeft,
  DollarSign, Image, LayoutTemplate, MessageSquare, HelpCircle, Tag, Settings,
  ClipboardList, Box, MessageCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { useState } from 'react'

const links = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/repairs', label: 'Repairs', icon: Wrench },
  { to: '/admin/sell-requests', label: 'Sell Requests', icon: Smartphone },
  { to: '/admin/exchange-requests', label: 'Exchange Requests', icon: ArrowRightLeft },
  { to: '/admin/phone-valuation', label: 'Phone Valuation', icon: DollarSign },
  { to: '/admin/banners', label: 'Banners', icon: Image },
  { to: '/admin/homepage', label: 'Homepage', icon: LayoutTemplate },
  { to: '/admin/testimonials', label: 'Testimonials', icon: MessageSquare },
  { to: '/admin/faqs', label: 'FAQs', icon: HelpCircle },
  { to: '/admin/coupons', label: 'Coupons', icon: Tag },
  { to: '/admin/inventory', label: 'Inventory', icon: Box },
  { to: '/admin/contact-requests', label: 'Contact Requests', icon: MessageCircle },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ClipboardList },
]

export default function AdminSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  return (
    <aside className={`flex flex-col border-r border-gray-200 bg-white transition-all ${collapsed ? 'w-16' : 'w-64'}`}>
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
        {!collapsed && <span className="text-lg font-bold text-brand-600">Admin</span>}
        <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-400 hover:text-gray-600">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              } ${collapsed ? 'justify-center' : ''}`
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
