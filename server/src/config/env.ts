import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const NODE_ENV = (process.env.NODE_ENV || 'development').trim().toLowerCase()
const isProduction = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'

function required(name: string, fallback?: string): string | undefined {
  const value = (process.env[name] || '').trim()
  if (value) return value
  if (fallback !== undefined && !isProduction) return fallback
  return undefined
}

// In production the server must not boot unless every mandatory variable is
// present. There are no fallback secrets here.
const MANDATORY = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET', 'CLIENT_URL']
const missing = isProduction ? MANDATORY.filter((key) => !(process.env[key] || '').trim()) : []

if (missing.length) {
  console.error(`[env] Fatal: missing required environment variable(s) in ${NODE_ENV}: ${missing.join(', ')}`)
  process.exit(1)
}

const jwtSecret = required('JWT_SECRET', isTest ? 'test-secret' : undefined)
const refreshSecret = required('JWT_REFRESH_SECRET', isTest ? 'test-refresh-secret' : undefined)

if (isProduction && (!jwtSecret || !refreshSecret || jwtSecret.length < 32 || refreshSecret.length < 32)) {
  console.error('[env] Fatal: JWT secrets must be at least 32 characters in production.')
  process.exit(1)
}

const razorpayKeyId = (process.env.RAZORPAY_KEY_ID || '').trim()
const razorpayKeySecret = (process.env.RAZORPAY_KEY_SECRET || '').trim()
const razorpayWebhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || '').trim()

// Razorpay must be fully configured or not at all — a half-configured gateway
// would silently disable online payments.
if (Boolean(razorpayKeyId) !== Boolean(razorpayKeySecret)) {
  console.warn('[env] Only one of RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET is set. Online payment will be disabled.')
}

export const env = {
  NODE_ENV,
  isProduction,
  isTest,
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: required('MONGODB_URI', 'mongodb://localhost:27017/omcellular'),
  JWT_SECRET: jwtSecret || 'dev-secret-change-in-production',
  JWT_REFRESH_SECRET: refreshSecret || 'dev-refresh-secret-change-in-production',
  CLIENT_URL: required('CLIENT_URL', 'http://localhost:5173'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  RAZORPAY_KEY_ID: razorpayKeyId,
  RAZORPAY_KEY_SECRET: razorpayKeySecret,
  RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
  // True only when every Razorpay credential is configured.
  RAZORPAY_CONFIGURED: Boolean(razorpayKeyId && razorpayKeySecret),
  RAZORPAY_WEBHOOK_CONFIGURED: Boolean(razorpayWebhookSecret),
} as const

export function assertRazorpayConfigured() {
  if (!env.RAZORPAY_CONFIGURED) {
    const error = new Error('Online payments are not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable them.')
    ;(error as any).statusCode = 503
    throw error
  }
}

if (isProduction) {
  console.log(`[env] OM Cellular API booting in production mode (port ${env.PORT}).`)
}