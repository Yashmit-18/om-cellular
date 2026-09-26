import dotenv from 'dotenv'
import path from 'path'
import { resolveRuntimeEnvironment, type RuntimeEnvironment } from './environment'

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

/** Reports a fatal misconfiguration and never returns. */
function fatal(message: string): never {
  console.error(`[env] Fatal: ${message}`)
  return process.exit(1)
}

/**
 * NODE_ENV is validated, never defaulted.
 *
 * It used to fall back to `development` when absent, and that default pointed
 * in the dangerous direction: `isProduction` gates every production-only
 * safeguard, so an unset NODE_ENV switched all of them off at once. A deploy
 * that lost the variable would have run against the live database with
 * development security — no mandatory secret enforcement, no JWT length
 * minimum, auth cookies without `secure`, raw error messages to clients, the
 * password-reset token echoed in the API response, and Mongoose rebuilding
 * every schema index on startup.
 *
 * Refusing to boot is the only safe response to an unknown environment, so an
 * absent or misspelt NODE_ENV is now a hard, explained startup failure rather
 * than a silent downgrade. `npm run dev` sets it for local development, and
 * `server/.env.example` documents it.
 */
function resolveNodeEnv(): RuntimeEnvironment {
  try {
    return resolveRuntimeEnvironment(process.env.NODE_ENV)
  } catch (error) {
    return fatal((error as Error).message)
  }
}

const NODE_ENV = resolveNodeEnv()
const isProduction = NODE_ENV === 'production'
const isTest = NODE_ENV === 'test'
const isDevelopment = NODE_ENV === 'development'

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

// Secrets are defaulted only for the two environments that deliberately run
// without a real secret, and each gets its own explicit value. Previously the
// exported value carried a second, unconditional `|| 'dev-secret-…'` fallback,
// which meant a missing secret could be masked in *any* mode rather than only
// the one that opts into a dummy. Every path here is unreachable in production,
// where the mandatory-variable check above has already terminated the process.
const jwtSecret = required(
  'JWT_SECRET',
  isTest ? 'test-secret' : isDevelopment ? 'dev-secret-change-in-production' : undefined,
)
const refreshSecret = required(
  'JWT_REFRESH_SECRET',
  isTest ? 'test-refresh-secret' : isDevelopment ? 'dev-refresh-secret-change-in-production' : undefined,
)

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
  isDevelopment,
  isTest,
  PORT: parseInt(process.env.PORT || '5000', 10),
  MONGODB_URI: required('MONGODB_URI', 'mongodb://localhost:27017/omcellular'),
  // Non-null in every bootable environment: production requires the variables
  // (checked above), and test/development supply an explicit default here.
  JWT_SECRET: jwtSecret!,
  JWT_REFRESH_SECRET: refreshSecret!,
  CLIENT_URL: required('CLIENT_URL', 'http://localhost:5173'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '',
  RAZORPAY_KEY_ID: razorpayKeyId,
  RAZORPAY_KEY_SECRET: razorpayKeySecret,
  RAZORPAY_WEBHOOK_SECRET: razorpayWebhookSecret,
  // True only when every Razorpay credential is configured.
  RAZORPAY_CONFIGURED: Boolean(razorpayKeyId && razorpayKeySecret),
  RAZORPAY_WEBHOOK_CONFIGURED: Boolean(razorpayWebhookSecret),
  PENDING_PAYMENT_TIMEOUT_MINUTES: Math.max(1, parseInt(process.env.PENDING_PAYMENT_TIMEOUT_MINUTES || '30', 10) || 30),
  PENDING_PAYMENT_SWEEP_INTERVAL_MINUTES: Math.max(1, parseInt(process.env.PENDING_PAYMENT_SWEEP_INTERVAL_MINUTES || '5', 10) || 5),
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