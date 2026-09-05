import { Routes, Route, useLocation } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'

import ShopLayout from './layouts/ShopLayout'
import AdminLayout from './layouts/AdminLayout'
import AccountLayout from './layouts/AccountLayout'

const Loading = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
  </div>
)

const Home = lazy(() => import('./pages/shop/HomePage'))
const Products = lazy(() => import('./pages/shop/ProductsPage'))
const ProductDetail = lazy(() => import('./pages/shop/ProductDetailPage'))
const Cart = lazy(() => import('./pages/shop/CartPage'))
const Checkout = lazy(() => import('./pages/shop/CheckoutPage'))
const Login = lazy(() => import('./pages/auth/LoginPage'))
const Register = lazy(() => import('./pages/auth/RegisterPage'))
const FAQ = lazy(() => import('./pages/shop/FAQPage'))
const Contact = lazy(() => import('./pages/shop/ContactPage'))
const BuyPhones = lazy(() => import('./pages/shop/BuyPhonesPage'))
const SellPhone = lazy(() => import('./pages/shop/SellPhonePage'))
const Exchange = lazy(() => import('./pages/shop/ExchangePage'))
const RepairBook = lazy(() => import('./pages/shop/RepairBookPage'))
const RepairTrack = lazy(() => import('./pages/shop/RepairTrackPage'))
const Search = lazy(() => import('./pages/shop/SearchPage'))
const Wishlist = lazy(() => import('./pages/shop/WishlistPage'))
const TrackOrder = lazy(() => import('./pages/shop/TrackOrderPage'))

const AccountDashboard = lazy(() => import('./pages/account/DashboardPage'))
const AccountProfile = lazy(() => import('./pages/account/ProfilePage'))
const AccountOrders = lazy(() => import('./pages/account/OrdersPage'))
const AccountOrderDetail = lazy(() => import('./pages/account/OrderDetailPage'))
const AccountReturns = lazy(() => import('./pages/account/ReturnsPage'))
const AccountRepairs = lazy(() => import('./pages/account/RepairsPage'))
const AccountSellRequests = lazy(() => import('./pages/account/SellRequestsPage'))
const AccountExchangeRequests = lazy(() => import('./pages/account/ExchangeRequestsPage'))
const AccountNotifications = lazy(() => import('./pages/account/NotificationsPage'))

const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'))
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage'))
const AdminProductEdit = lazy(() => import('./pages/admin/ProductEditPage'))
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage'))
const AdminOrderDetail = lazy(() => import('./pages/admin/OrderDetailPage'))
const AdminCustomers = lazy(() => import('./pages/admin/CustomersPage'))
const AdminCustomerDetail = lazy(() => import('./pages/admin/CustomerDetailPage'))
const AdminServiceAreas = lazy(() => import('./pages/admin/ServiceAreasPage'))
const AdminServiceRequests = lazy(() => import('./pages/admin/ServiceRequestsPage'))
const AdminRepairs = lazy(() => import('./pages/admin/RepairsPage'))
const AdminRepairDetail = lazy(() => import('./pages/admin/RepairDetailPage'))
const AdminSellRequests = lazy(() => import('./pages/admin/SellRequestsPage'))
const AdminSellDetail = lazy(() => import('./pages/admin/SellDetailPage'))
const AdminReturns = lazy(() => import('./pages/admin/ReturnsPage'))
const AdminExchangeRequests = lazy(() => import('./pages/admin/ExchangeRequestsPage'))
const AdminExchangeDetail = lazy(() => import('./pages/admin/ExchangeDetailPage'))
const AdminPhoneValuation = lazy(() => import('./pages/admin/PhoneValuationPage'))
const AdminBanners = lazy(() => import('./pages/admin/BannersPage'))
const AdminHomepage = lazy(() => import('./pages/admin/HomepageSectionsPage'))
const AdminTestimonials = lazy(() => import('./pages/admin/TestimonialsPage'))
const AdminFAQs = lazy(() => import('./pages/admin/FAQsPage'))
const AdminInformationCards = lazy(() => import('./pages/admin/InformationCardsPage'))
const AdminCoupons = lazy(() => import('./pages/admin/CouponsPage'))
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'))
const AdminAuditLog = lazy(() => import('./pages/admin/AuditLogPage'))
const AdminInventory = lazy(() => import('./pages/admin/InventoryPage'))
const AdminContactRequests = lazy(() => import('./pages/admin/ContactRequestsPage'))
const AdminRepairServices = lazy(() => import('./pages/admin/RepairServicesPage'))
const AdminPhoneCatalog = lazy(() => import('./pages/admin/PhoneCatalogPage'))
const AdminBrands = lazy(() => import('./pages/admin/BrandsPage'))
const AdminNotifications = lazy(() => import('./pages/admin/NotificationsPage'))
const AdminLogin = lazy(() => import('./pages/admin/AdminLoginPage'))

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }) }, [pathname])
  return null
}

const PAGE_TITLES: Record<string, string> = {
  '/': 'OM Cellular - Buy, Sell, Repair & Exchange Phones',
  '/buy-phones': 'Buy Certified Used & Refurbished Phones | OM Cellular',
  '/products': 'All Products | OM Cellular',
  '/sell-phone': 'Sell Your Old Phone for the Best Price | OM Cellular',
  '/exchange': 'Phone Exchange | OM Cellular',
  '/repair': 'Book a Phone Repair | OM Cellular',
  '/repair/track': 'Track Your Repair | OM Cellular',
  '/cart': 'Your Cart | OM Cellular',
  '/wishlist': 'Wishlist | OM Cellular',
  '/faq': 'FAQs | OM Cellular',
  '/contact': 'Contact Us | OM Cellular',
  '/track-order': 'Track Your Order | OM Cellular',
  '/login': 'Login | OM Cellular',
  '/register': 'Create Account | OM Cellular',
  '/account': 'My Account | OM Cellular',
  '/account/orders': 'My Orders | OM Cellular',
  '/account/returns': 'Returns & Refunds | OM Cellular',
  '/account/repairs': 'My Repairs | OM Cellular',
  '/account/sell-requests': 'My Sell Requests | OM Cellular',
  '/account/exchange-requests': 'My Exchange Requests | OM Cellular',
  '/account/notifications': 'Notifications | OM Cellular',
  '/admin': 'Admin Dashboard | OM Cellular',
}

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const exact = PAGE_TITLES[pathname]
    if (exact) document.title = exact
  }, [pathname])
  return null
}

export default function App() {
  return (
    <Suspense fallback={<Loading />}>
      <ScrollToTop />
      <RouteTitle />
      <Routes>
        <Route element={<ShopLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/buy-phones" element={<BuyPhones />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/sell-phone" element={<SellPhone />} />
          <Route path="/exchange" element={<Exchange />} />
          <Route path="/repair" element={<RepairBook />} />
          <Route path="/repair/track" element={<RepairTrack />} />
          <Route path="/search" element={<Search />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/track-order" element={<TrackOrder />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<AccountLayout />}>
          <Route path="/account" element={<AccountDashboard />} />
          <Route path="/account/profile" element={<AccountProfile />} />
          <Route path="/account/orders" element={<AccountOrders />} />
          <Route path="/account/orders/:id" element={<AccountOrderDetail />} />
          <Route path="/account/returns" element={<AccountReturns />} />
          <Route path="/account/repairs" element={<AccountRepairs />} />
          <Route path="/account/sell-requests" element={<AccountSellRequests />} />
          <Route path="/account/exchange-requests" element={<AccountExchangeRequests />} />
          <Route path="/account/notifications" element={<AccountNotifications />} />
        </Route>

        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/:id" element={<AdminProductEdit />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="orders/:id" element={<AdminOrderDetail />} />
          <Route path="customers" element={<AdminCustomers />} />
          <Route path="customers/:id" element={<AdminCustomerDetail />} />
          <Route path="service-areas" element={<AdminServiceAreas />} />
          <Route path="service-requests" element={<AdminServiceRequests />} />
          <Route path="repairs" element={<AdminRepairs />} />
          <Route path="repairs/:id" element={<AdminRepairDetail />} />
          <Route path="sell-requests" element={<AdminSellRequests />} />
          <Route path="sell-requests/:id" element={<AdminSellDetail />} />
          <Route path="returns" element={<AdminReturns />} />
          <Route path="exchange-requests" element={<AdminExchangeRequests />} />
          <Route path="exchange-requests/:id" element={<AdminExchangeDetail />} />
          <Route path="phone-valuation" element={<AdminPhoneValuation />} />
          <Route path="banners" element={<AdminBanners />} />
          <Route path="homepage" element={<AdminHomepage />} />
          <Route path="testimonials" element={<AdminTestimonials />} />
          <Route path="faqs" element={<AdminFAQs />} />
          <Route path="information-cards" element={<AdminInformationCards />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="brands" element={<AdminBrands />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="repair-services" element={<AdminRepairServices />} />
          <Route path="phone-catalog" element={<AdminPhoneCatalog />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit-log" element={<AdminAuditLog />} />
          <Route path="inventory" element={<AdminInventory />} />
          <Route path="contact-requests" element={<AdminContactRequests />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
