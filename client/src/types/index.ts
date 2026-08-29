export type UserRole = 'ADMIN' | 'CUSTOMER'
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED'
export type PaymentMethod = 'cod' | 'online' | 'upi'
export type DiscountType = 'PERCENTAGE' | 'FIXED'
export type Condition = 'NEW' | 'LIKE_NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR'
export type RepairStatus = 'PENDING' | 'RECEIVED' | 'DIAGNOSED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELIVERED' | 'CANCELLED'
export type RequestStatus = 'PENDING' | 'RECEIVED' | 'EVALUATING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'
export type NotificationType = 'ORDER' | 'PROMOTION' | 'SYSTEM' | 'REPAIR' | 'SELL' | 'EXCHANGE'
export type SectionType = 'featured_products' | 'new_arrivals' | 'best_sellers' | 'categories' | 'banners' | 'testimonials' | 'custom'
export type ContactStatus = 'PENDING' | 'READ' | 'REPLIED' | 'ARCHIVED'

export interface User {
  id: string
  name: string | null
  email: string | null
  phone: string | null
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
  icon: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
  products?: Product[]
}

export interface Brand {
  id: string
  name: string
  slug: string
  logo: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Product {
  id: string
  name: string
  slug: string
  description: string | null
  categoryId: string | null
  brandId: string | null
  isActive: boolean
  isFeatured: boolean
  isNewArrival: boolean
  isBestSeller: boolean
  isRefurbished: boolean
  condition: string | null
  warranty: string | null
  returnPolicy: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  images: string[]
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
  reservedStock: number
  soldCount: number
  images: string
  condition: string | null
  batteryHealth: number | null
  specifications: string
  whatsIncluded: string
  isRefurbished: boolean
  featured: boolean
  badge: string | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  product?: Product
  inventory?: Inventory
  orderItems?: OrderItem[]
  wishlist?: Wishlist[]
  reviews?: Review[]
}

export interface Inventory {
  id: string
  variantId: string
  quantity: number
  lowStockThreshold: number
  updatedAt: Date
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
  country: string
  isDefault: boolean
  createdAt: Date
  user?: User
  orders?: Order[]
}

export interface Order {
  id: string
  orderNumber: string
  userId: string
  addressId: string | null
  status: OrderStatus
  total: number
  discount: number
  shipping: number
  tax: number
  paymentMethod: string | null
  paymentStatus: PaymentStatus
  couponId: string | null
  couponDiscount: number
  trackingNumber: string | null
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
  price: number
  quantity: number
  total: number
  discount: number
  order?: Order
  variant?: ProductVariant
}

export interface Review {
  id: string
  userId: string
  variantId: string
  rating: number
  title: string | null
  comment: string | null
  isAdminReply: boolean
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
  type: DiscountType
  value: number
  minOrderAmount: number | null
  maxDiscount: number | null
  usageLimit: number | null
  usedCount: number
  expiresAt: Date
  applicableTo: string
  applicableProductIds: string
  applicableCategoryIds: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RepairService {
  id: string
  name: string
  slug: string
  description: string | null
  estimatedDuration: string | null
  startingPrice: number | null
  compatibleDevices: string
  warranty: string | null
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
  serviceId: string | null
  phone: string | null
  brand: string
  model: string
  problemDescription: string
  appointmentDate: string | null
  appointmentTime: string | null
  status: RepairStatus
  notes: string | null
  technicianNotes: string | null
  estimatedCost: number | null
  finalCost: number | null
  pickupRequired: boolean
  pickupAddress: string | null
  technicianName: string | null
  createdAt: Date
  updatedAt: Date
  user?: User
  service?: RepairService
  statusHistory?: RepairStatusHistory[]
}

export interface RepairStatusHistory {
  id: string
  repairId: string
  status: string
  note: string | null
  createdAt: Date
  repair?: RepairBooking
}

export interface SellRequest {
  id: string
  requestNumber: string
  userId: string | null
  phone: string | null
  brand: string
  model: string
  condition: string
  storage: string
  ram: string | null
  age: string | null
  displayCondition: string | null
  batteryCondition: string | null
  cameraCondition: string | null
  bodyCondition: string | null
  accessoriesAvailable: boolean
  originalBill: boolean
  originalBox: boolean
  estimatedPrice: number | null
  finalOfferedPrice: number | null
  pickupAddress: string | null
  pickupDate: Date | null
  pickupTime: string | null
  status: RequestStatus
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
  user?: User | null
}

export interface ExchangeRequest {
  id: string
  requestNumber: string
  userId: string | null
  phone: string | null
  oldBrand: string
  oldModel: string
  oldStorage: string | null
  oldRam: string | null
  oldCondition: string
  oldDeviceDetails: string
  newVariantId: string | null
  estimatedExchangeValue: number | null
  finalExchangeValue: number | null
  difference: number | null
  status: string
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
  user?: User | null
  newVariant?: ProductVariant | null
}

export interface Notification {
  id: string
  userId: string
  title: string
  message: string
  type: string
  isRead: boolean
  metadata: string
  createdAt: Date
  user?: User
}

export interface HomepageSection {
  id: string
  title: string
  subtitle: string | null
  type: SectionType
  isActive: boolean
  sortOrder: number
  productIds: string
  ctaText: string | null
  ctaLink: string | null
  image: string | null
  background: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Banner {
  id: string
  title: string
  subtitle: string | null
  image: string
  ctaText: string | null
  ctaLink: string | null
  isActive: boolean
  sortOrder: number
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface InformationCard {
  id: string
  title: string
  description: string | null
  icon: string | null
  ctaText: string | null
  ctaLink: string | null
  image: string | null
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}

export interface Testimonial {
  id: string
  customerName: string
  customerImage: string | null
  comment: string
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
  subject: string | null
  message: string
  status: ContactStatus
  adminNotes: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Setting {
  id: string
  key: string
  value: string
  group: string | null
  createdAt: Date
  updatedAt: Date
}

export interface AuditLog {
  id: string
  adminId: string | null
  action: string
  entity: string
  entityId: string | null
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  createdAt: Date
  admin?: User | null
}

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

export interface SessionUser {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Session {
  user: SessionUser
}

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

export interface PhoneCatalogModelEntry {
  id: string
  brandName: string
  modelName: string
  slug: string
  storageVariants: Array<{
    storage: string
    ram: string
    baseValue: number
  }>
  isActive: boolean
  sortOrder: number
  createdAt: Date
  updatedAt: Date
}
