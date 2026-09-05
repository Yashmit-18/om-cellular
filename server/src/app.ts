import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'path'
import { corsOptions } from './config/cors'
import { errorHandler } from './middleware/error'
import { release } from './config/version'

// Route imports
import authRoutes from './routes/auth'
import productRoutes from './routes/products'
import categoryRoutes from './routes/categories'
import brandRoutes from './routes/brands'
import orderRoutes from './routes/orders'
import returnRoutes from './routes/returns'
import warrantyRoutes from './routes/warranties'
import repairRoutes from './routes/repairs'
import sellRequestRoutes from './routes/sellRequests'
import exchangeRequestRoutes from './routes/exchangeRequests'
import phoneValuationRoutes from './routes/phoneValuations'
import reviewRoutes from './routes/reviews'
import couponRoutes from './routes/coupons'
import cmsRoutes from './routes/cms'
import settingsRoutes from './routes/settings'
import customerRoutes from './routes/customers'
import notificationRoutes from './routes/notifications'
import contactRequestRoutes from './routes/contactRequests'
import analyticsRoutes from './routes/analytics'
import auditLogRoutes from './routes/auditLogs'
import uploadRoutes from './routes/uploads'
import inventoryRoutes from './routes/inventory'
import phoneCatalogRoutes from './routes/phoneCatalog'
import paymentRoutes from './routes/payments'
import addressRoutes from './routes/addresses'
import serviceabilityRoutes from './routes/serviceability'

const app = express()

// Behind Render's reverse proxy, trust exactly one hop so req.ip / rate
// limiting see the real client address instead of the shared proxy IP.
app.set('trust proxy', 1)

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors(corsOptions))

// Health check (safe: exposes version + injected commit only, never secrets).
// Mounted before the rate limiter so uptime probes and Render's health check
// are never throttled by normal API traffic.
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    message: 'OM Cellular API is running',
    version: release.version,
    commit: release.commit,
    timestamp: new Date().toISOString(),
  })
})

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
}))

// Body parsing — bounded to 2mb. The raw body is only retained for the payment
// webhook signature and never for whole-request buffers.
app.use(express.json({
  limit: '2mb',
  verify: (req: any, _res, buf) => {
    // Preserve the raw body so payment webhook signatures can be verified
    // against the exact bytes Razorpay signed.
    req.rawBody = buf
  },
}))
app.use(express.urlencoded({ extended: true, limit: '2mb' }))
app.use(cookieParser())

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// API Routes
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/products', productRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/brands', brandRoutes)
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/returns', returnRoutes)
app.use('/api/v1/warranties', warrantyRoutes)
app.use('/api/v1/repairs', repairRoutes)
app.use('/api/v1/sell-requests', sellRequestRoutes)
app.use('/api/v1/exchange-requests', exchangeRequestRoutes)
app.use('/api/v1/phone-valuations', phoneValuationRoutes)
app.use('/api/v1/reviews', reviewRoutes)
app.use('/api/v1/coupons', couponRoutes)
app.use('/api/v1/banners', cmsRoutes.banners)
app.use('/api/v1/homepage-sections', cmsRoutes.homepageSections)
app.use('/api/v1/information-cards', cmsRoutes.informationCards)
app.use('/api/v1/testimonials', cmsRoutes.testimonials)
app.use('/api/v1/faqs', cmsRoutes.faqs)
app.use('/api/v1/settings', settingsRoutes)
app.use('/api/v1/customers', customerRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/contact-requests', contactRequestRoutes)
app.use('/api/v1/analytics', analyticsRoutes)
app.use('/api/v1/audit-logs', auditLogRoutes)
app.use('/api/v1/uploads', uploadRoutes)
app.use('/api/v1/inventory', inventoryRoutes)
app.use('/api/v1/phone-catalog', phoneCatalogRoutes)
app.use('/api/v1/payments', paymentRoutes)
app.use('/api/v1/addresses', addressRoutes)
app.use('/api/v1/serviceability', serviceabilityRoutes)

// Error handler
app.use(errorHandler)

export default app
