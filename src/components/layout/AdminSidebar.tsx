"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Boxes,
  ShoppingCart,
  Users,
  Wrench,
  ArrowUpDown,
  RefreshCw,
  Ticket,
  Home,
  Image,
  Star,
  HelpCircle,
  Bell,
  Mail,
  BarChart3,
  Settings,
  UserCog,
  FileText,
  Phone,
  X,
  ChevronLeft,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "Main",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Products", href: "/admin/products", icon: Package },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
      { label: "Repairs", href: "/admin/repairs", icon: Wrench },
    ],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
      { label: "Customers", href: "/admin/customers", icon: Users },
      { label: "Sell Requests", href: "/admin/sell-requests", icon: ArrowUpDown },
      { label: "Exchange Requests", href: "/admin/exchange-requests", icon: RefreshCw },
      { label: "Coupons", href: "/admin/coupons", icon: Ticket },
    ],
  },
  {
    title: "Content",
    items: [
      { label: "Homepage", href: "/admin/homepage", icon: Home },
      { label: "Banners", href: "/admin/banners", icon: Image },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "FAQs", href: "/admin/faqs", icon: HelpCircle },
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Contact Requests", href: "/admin/contact-requests", icon: Mail },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Reports", href: "/admin/reports", icon: BarChart3 },
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Admin Users", href: "/admin/admin-users", icon: UserCog },
      { label: "Audit Log", href: "/admin/audit-log", icon: FileText },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  const sidebarContent = (
    <div className={`flex h-full flex-col bg-gray-950 text-gray-300 transition-all duration-300 ${collapsed ? "w-[68px]" : "w-64"}`}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between border-b border-gray-800 px-4">
        {!collapsed && (
          <Link href="/admin" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563eb]">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">
              OM <span className="text-[#2563eb]">Admin</span>
            </span>
          </Link>
        )}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform ${collapsed ? "rotate-180" : ""}`} />
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      title={collapsed ? item.label : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        active
                          ? "bg-[#2563eb]/15 text-[#2563eb]"
                          : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-200"
                      } ${collapsed ? "justify-center px-2" : ""}`}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative z-10 h-full w-64">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
