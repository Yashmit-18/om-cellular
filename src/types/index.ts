// ─── Database Model Types ────────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'CUSTOMER'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type PaymentMethod = 'cod' | 'online' | 'upi'
export type DiscountType = 'percentage' | 'fixed'
export type Condition = 'NEW' | 'LIKE_NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR'
export type RepairStatus = 'PENDING' | 'RECEIVED' | 'DIAGNOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
export type RequestStatus = 'PENDING' | 'RECEIVED' | 'EVALUATING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
export type NotificationType = 'ORDER' | 'PROMOTION' | 'SYSTEM' | 'REPAIR' | 'SELL' | 'EXCHANGE'
export type SectionType = 'featured_products' | 'new_arrivals' | 'best_sellers' | 'categories' | 'banners' | 'testimonials' | 'custom'
export type ContactStatus = 'PENDING' | 'READ' | 'REPLIED' | 'ARCHIVED'

export interface User {
  id: string
  name: string
  email: string
  phone: string | null
  password: string | null
  role: UserRole
  image: string | null
  createdAt: Date
  updatedAt: Date
  addresses?: Address[]
  orders?: Order[]
  reviews?: Review[]
  wishlist?: Wishlist[]
  notifications?: Notification[]
  repairBookings?: RepairBooking[]
  sellRequests?: SellRequest[]
  exchangeRequests?: ExchangeRequest[]
  auditLogs?: AuditLog[]
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  parentId: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  parent?: Category | null
  children?: Category[]
  products?: Product[]
}

export interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  products?: Product[]
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string
  shortDescription: string | null
  categoryId: string
  brandId: string
  isActive: boolean
  isFeatured: boolean
  createdAt: Date
  updatedAt: Date
  category?: Category
  brand?: Brand
  variants?: ProductVariant[]
  reviews?: Review[]
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku: string
  price: number
  discountPrice: number | null
  color: string | null
  storage: string | null
  ram: string | null
  stock: number
  images: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  product?: Product
  inventory?: Inventory[]
  orderItems?: OrderItem[]
  wishlist?: Wishlist[]
  reviews?: Review[]
}

export interface Inventory {
  id: string
  variantId: string
  quantity: number
  type: string
  reference: string | null
  note: string | null
  createdAt: Date
  variant?: ProductVariant
}

export interface Address {
  id: string
  userId: string
  name: string
  phone: string
  addressLine1: string
  addressLine2: string | null
  city: string
  state: string
  pincode: string
  isDefault: boolean
  createdAt: Date
  updatedAt: Date
  user?: User
  orders?: Order[]
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  addressId: string
  status: OrderStatus
  totalAmount: number
  discountAmount: number
  shippingCharge: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  couponCode: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  address?: Address
  items?: OrderItem[]
}

export interface OrderItem {
  id: string
  orderId: string
  variantId: string
  name: string
  price: number
  quantity: number
  total: number
  order?: Order
  variant?: ProductVariant
}

export interface Review {
  id: string
  userId: string
  variantId: string
  rating: number
  title: string
  comment: string
  isApproved: boolean
  createdAt: Date
  updatedAt: Date
  user?: User
  variant?: ProductVariant
}

export interface Wishlist {
  id: string
  userId: string
  variantId: string
  createdAt: Date
  user?: User
  variant?: ProductVariant
}

export interface Coupon {
  id: string
  code: string
  description: string | null
  discountType: DiscountType
  discountValue: number
  minOrderAmount: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  validFrom: Date
  validUntil: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RepairService {
  id: string
  name: string
  slug: string
  description: string | null
  image: string | null
  estimatedTime: string | null
  price: number | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  bookings?: RepairBooking[]
}

export interface RepairBooking {
  id: string
  bookingNumber: string
  userId: string
  serviceId: string
  brand: string
  model: string
  issueDescription: string
  name: string
  email: string
  phone: string
  preferredDate: string | null
  preferredTime: string | null
  status: RepairStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  service?: RepairService
  statusHistory?: RepairStatusHistory[]
}

export interface RepairStatusHistory {
  id: string
  bookingId: string
  status: string
  note: string | null
  createdAt: Date
  booking?: RepairBooking
}

export interface SellRequest {
  id: string
  requestNumber: string
  userId: string | null
  brand: string
  model: string
  condition: Condition
  storage: string
  color: string | null
  description: string | null
  askingPrice: number
  images: string
  status: RequestStatus
  name: string
  email: string
  phone: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user?: User | null
}

export interface ExchangeRequest {
  id: string
  requestNumber: string
  userId: string | null
  brand: string
  model: string
  condition: Condition
  storage: string
  color: string | null
  description: string | null
  askingPrice: number
  images: string
  desiredProductId: string | null
  status: RequestStatus
  name: string
  email: string
  phone: string
  notes: string | null
  createdAt: Date
  updatedAt: Date
  user?: User | null
  desiredProduct?: Product | null
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: NotificationType
  isRead: boolean
  link: string | null
  createdAt: Date
  user?: User
}

export interface HomepageSection {
  id: string
  title: string
  type: SectionType
  isActive: boolean
  sortOrder: number
  items: string
  createdAt: Date
  updatedAt: Date
}

export interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  link: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface InformationCard {
  id: string
  title: string
  description: string | null
  icon: string | null
  link: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Testimonial {
  id: string
  name: string
  designation: string | null
  avatar: string | null
  content: string
  rating: number | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface FAQ {
  id: string
  question: string
  answer: string
  category: string | null
  sortOrder: number
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface ContactRequest {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string
  message: string
  status: ContactStatus
  notes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Setting {
  id: string
  key: string
  value: string
  type: string
  group: string
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  oldData: string | null
  newData: string | null
  ip: string | null
  createdAt: Date
  user?: User | null
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: Pagination
}

// ─── Pagination Types ────────────────────────────────────────────────────────

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface ProductFilter extends PaginationParams {
  query?: string
  categoryId?: string
  brandId?: string
  minPrice?: number
  maxPrice?: number
  condition?: Condition
  inStock?: boolean
  isFeatured?: boolean
  isNewArrival?: boolean
}

export interface RepairBookingFilter extends PaginationParams {
  status?: RepairStatus
  serviceId?: string
  userId?: string
}

export interface OrderFilter extends PaginationParams {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  userId?: string
}

export interface SellRequestFilter extends PaginationParams {
  status?: RequestStatus
  condition?: Condition
}

// ─── Cart & Wishlist Types ───────────────────────────────────────────────────

export interface CartItem {
  id: string
  variantId: string
  productId: string
  name: string
  slug: string
  image: string
  price: number
  discountPrice: number | null
  quantity: number
  stock: number
  selectedColor?: string
  selectedStorage?: string
}

export interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  removeItem: (variantId: string) => void
  updateQuantity: (variantId: string, quantity: number) => void
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

// ─── Homepage Section Types ──────────────────────────────────────────────────

export interface HomepageData {
  banners: Banner[]
  sections: HomepageSection[]
  featuredProducts: ProductWithVariant[]
  newArrivals: ProductWithVariant[]
  bestSellers: ProductWithVariant[]
  categories: Category[]
  testimonials: Testimonial[]
  informationCards: InformationCard[]
}

export interface ProductWithVariant extends Product {
  lowestPrice: number
  highestPrice: number
  inStock: boolean
  variantCount: number
  primaryImage: string
}

// ─── Search Types ────────────────────────────────────────────────────────────

export interface SearchResult {
  products: ProductWithVariant[]
  categories: Category[]
  brands: Brand[]
  totalCount: number
}

export interface SearchSuggestion {
  type: 'product' | 'category' | 'brand'
  id: string
  name: string
  slug: string
  image?: string
}

// ─── Session Types ───────────────────────────────────────────────────────────

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Session {
  user: SessionUser
}

// ─── Dashboard Stats ─────────────────────────────────────────────────────────

export interface DashboardStats {
  totalOrders: number
  totalRevenue: number
  totalProducts: number
  totalUsers: number
  pendingOrders: number
  pendingRepairs: number
  pendingSellRequests: number
  recentOrders: Order[]
}
