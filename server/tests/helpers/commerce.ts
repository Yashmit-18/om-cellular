/**
 * Deterministic, isolated commerce fixtures for the DB-backed suite.
 *
 * Everything here writes through the REAL production Mongoose models into the
 * REAL isolated MongoDB. There are no fake repositories, no in-memory doubles
 * and no simplified schemas. Identifiers are clearly test-only (TEST-*) so a
 * fixture row can never be mistaken for catalogue, customer or order data, and
 * fixtures are never added to any production seed script.
 *
 * The suite empties every collection between tests (see resetTestDb), so the
 * fixed TEST-* identifiers below are deterministic within a test. A per-process
 * counter disambiguates the cases where a test legitimately needs two rows of
 * the same kind.
 */
import express from 'express'
import cookieParser from 'cookie-parser'
import mongoose from 'mongoose'
import { randomUUID } from 'node:crypto'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import orderRoutes from '../../src/routes/orders'
import couponRoutes from '../../src/routes/coupons'
import inventoryRoutes from '../../src/routes/inventory'
import { generateTokens } from '../../src/middleware/auth'
import { User } from '../../src/models/user.model'
import { Address } from '../../src/models/address.model'
import { Product } from '../../src/models/product.model'
import { ProductVariant } from '../../src/models/productVariant.model'
import { Coupon } from '../../src/models/coupon.model'
import { ServiceArea } from '../../src/models/serviceArea.model'

export const TEST_IDS = {
  customer: 'TEST-CUSTOMER-001',
  otherCustomer: 'TEST-CUSTOMER-002',
  product1: 'TEST-PRODUCT-001',
  product2: 'TEST-PRODUCT-002',
  variant1: 'TEST-VARIANT-001',
  variant2: 'TEST-VARIANT-002',
  coupon: 'TEST-COUPON-001',
  serviceablePin: '400001',
  nonServiceablePin: '999999',
  admin: 'TEST-ADMIN-001',
} as const

export const UNIT_PRICE = 100

/**
 * Deterministic, obviously test-only ObjectIds built from a fixed 12-byte
 * pattern, so no two entity types can collide and every id is reproducible.
 * 0xd2 0x50 marks the row as D25 test data; the last byte is the entity tag.
 */
const ENTITY_TAGS = {
  customer: 0x01,
  otherCustomer: 0x02,
  admin: 0x03,
  product1: 0x11,
  product2: 0x12,
  variant1: 0x21,
  variant2: 0x22,
} as const

export type EntityKind = keyof typeof ENTITY_TAGS

export function objectIdFor(kind: EntityKind) {
  const bytes = Buffer.alloc(12)
  bytes[0] = 0xd2
  bytes[1] = 0x50
  bytes[11] = ENTITY_TAGS[kind]
  return new mongoose.Types.ObjectId(bytes)
}

let sequence = 0
function nextSequence(): number {
  sequence += 1
  return sequence
}

/** A real User row. Password is never set; nothing here is a credential. */
export async function createCustomer(kind: 'customer' | 'otherCustomer' = 'customer') {
  const id = TEST_IDS[kind]
  return User.create({
    _id: objectIdFor(kind),
    name: `Test Customer ${id}`,
    email: `${id.toLowerCase()}@omcellular.test`,
    phone: `9000${String(nextSequence()).padStart(6, '0')}`.slice(0, 10),
    role: 'CUSTOMER',
    tokenVersion: 0,
  })
}

/** A real Address row owned by the given user. */
export async function createAddress(userId: any, pincode = TEST_IDS.serviceablePin) {
  return Address.create({
    userId,
    name: 'Test Recipient',
    phone: '9876543210',
    addressLine1: 'TEST-ADDRESS-LINE-1',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode,
    country: 'IN',
    isDefault: true,
  })
}

/** A real Product row (active, so the route's product gate passes). */
export async function createProduct(kind: 'product1' | 'product2' = 'product1', overrides: Record<string, unknown> = {}) {  const id = TEST_IDS[kind]
  return Product.create({
    _id: objectIdFor(kind),
    name: `Test Product ${id}`,
    slug: id.toLowerCase(),
    description: 'Isolated DB-backed regression fixture. Not catalogue data.',
    isActive: true,
    ...overrides,
  })
}

/** A real ProductVariant row carrying the stock the assertions will check. */
export async function createVariant(options: {
  productId: any
  stock: number
  kind?: 'variant1' | 'variant2'
  price?: number
  discountPrice?: number | null
  isActive?: boolean
}) {
  const kind = options.kind ?? 'variant1'
  const id = TEST_IDS[kind]
  return ProductVariant.create({
    _id: objectIdFor(kind),
    productId: options.productId,
    name: `Test Variant ${id}`,
    sku: id,
    price: options.price ?? UNIT_PRICE,
    ...(options.discountPrice === null ? {} : { discountPrice: options.discountPrice }),
    stock: options.stock,
    reservedStock: 0,
    soldCount: 0,
    isActive: options.isActive ?? true,
  })
}

/**
 * Inserts a variant whose `price` is absent. The Mongoose schema forbids that
 * (price is required, min 0), so the row is written through the native
 * collection. This is still a real MongoDB document and is the only way to
 * reach the route's defensive "Pricing data unavailable" branch, which exists
 * precisely for legacy/corrupt rows the schema would no longer permit.
 */
export async function createVariantWithoutPrice(options: { productId: any; stock: number; kind?: 'variant1' | 'variant2' }) {
  const kind = options.kind ?? 'variant1'
  const id = TEST_IDS[kind]
  await ProductVariant.collection.insertOne({
    _id: objectIdFor(kind),
    productId: options.productId,
    name: `Test Variant ${id}`,
    sku: id,
    stock: options.stock,
    reservedStock: 0,
    soldCount: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  return objectIdFor(kind)
}

export interface CouponOptions {
  code?: string
  type?: 'PERCENTAGE' | 'FIXED'
  value?: number
  minOrderAmount?: number
  maxDiscount?: number
  usageLimit?: number
  maxPerUser?: number
  usedCount?: number
  applicableTo?: 'ALL' | 'PRODUCTS' | 'CATEGORIES'
  applicableProductIds?: string[]
  applicableCategoryIds?: string[]
  isActive?: boolean
  expiresAt?: Date | null
}

export async function createCoupon(options: CouponOptions = {}) {
  return Coupon.create({
    code: options.code ?? TEST_IDS.coupon,
    description: 'Isolated DB-backed regression fixture.',
    type: options.type ?? 'PERCENTAGE',
    value: options.value ?? 10,
    minOrderAmount: options.minOrderAmount,
    maxDiscount: options.maxDiscount,
    usageLimit: options.usageLimit,
    maxPerUser: options.maxPerUser,
    usedCount: options.usedCount ?? 0,
    applicableTo: options.applicableTo ?? 'ALL',
    applicableProductIds: options.applicableProductIds ?? [],
    applicableCategoryIds: options.applicableCategoryIds ?? [],
    expiresAt: options.expiresAt ?? null,
    isActive: options.isActive ?? true,
  })
}

/**
 * Turns on the serviceability gate with one enabled delivery area serving only
 * TEST_IDS.serviceablePin. Any other pincode is then genuinely non-serviceable.
 */
export async function enableServiceAreas() {
  return ServiceArea.create({
    city: 'Test City',
    state: 'Test State',
    pinCodes: [TEST_IDS.serviceablePin],
    isEnabled: true,
    services: { delivery: true, repair: true, pickupDrop: true, sell: true, exchange: true },
  })
}

// ---------------------------------------------------------------------------
// Real HTTP surface
// ---------------------------------------------------------------------------

export interface HttpResponse<T = any> {
  status: number
  body: T
}

export interface PostOptions {
  /**
   * Controls the `Idempotency-Key` header for one request.
   *
   * Omit it (or pass a fresh key) for a brand new checkout attempt — the
   * default, which is what almost every test wants. Pass a fixed key to replay
   * one attempt. Pass `null` to send no header at all, which is how the
   * now-mandatory contract is proven.
   */
  idempotencyKey?: string | null
}

/** A canonical v4 key, matching what a real client generates. */
export function newIdempotencyKey(): string {
  return randomUUID()
}

export interface CommerceClient {
  baseUrl: string
  post(path: string, body: unknown, token?: string, options?: PostOptions): Promise<HttpResponse>
  put(path: string, body: unknown, token?: string): Promise<HttpResponse>
  get(path: string, token?: string): Promise<HttpResponse>
  /**
   * Issues a GET against the REAL coupons router. Used to prove that
   * `GET /coupons/validate/:code` and `POST /orders` reject with the same
   * reason, since the storefront validates with one and submits to the other.
   */
  getCoupon(path: string, token?: string): Promise<HttpResponse>
  /**
   * Issues a GET against the REAL admin inventory router. Used to prove that
   * every admin-facing inventory read is derived from ProductVariant.stock and
   * therefore cannot contradict the authoritative source when the Inventory
   * mirror has drifted.
   */
  getInventory(path: string, token?: string): Promise<HttpResponse>
  close(): Promise<void>
}

/**
 * Mounts the REAL orders router behind the REAL JWT auth middleware and talks
 * to it over a real socket on an OS-assigned port. Nothing about the request
 * path is stubbed: express, the router, the middleware, the service layer and
 * MongoDB all participate.
 */
export async function startCommerceClient(): Promise<CommerceClient> {
  const app = express()
  app.use(express.json())
  app.use(cookieParser())
  app.use('/api/v1/orders', orderRoutes)
  app.use('/api/v1/coupons', couponRoutes)
  app.use('/api/v1/inventory', inventoryRoutes)

  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening))
  })
  const { port } = server.address() as AddressInfo
  const ordersUrl = `http://127.0.0.1:${port}/api/v1/orders`
  const couponsUrl = `http://127.0.0.1:${port}/api/v1/coupons`
  const inventoryUrl = `http://127.0.0.1:${port}/api/v1/inventory`

  async function request(
    method: 'GET' | 'POST' | 'PUT',
    url: string,
    body: unknown,
    token?: string,
    idempotencyHeader?: string | null
  ): Promise<HttpResponse> {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      // Node's global fetch pools keep-alive sockets. Without this the HTTP
      // agent holds the connection open and close() below would never resolve,
      // leaving a lingering handle after the suite finishes.
      connection: 'close',
    }
    if (token) headers.authorization = `Bearer ${token}`
    // `undefined` means "new attempt, mint a key"; `null` means "send nothing".
    if (idempotencyHeader === null) {
      // deliberate: omitting the header is the case under test
    } else {
      headers['idempotency-key'] = idempotencyHeader ?? newIdempotencyKey()
    }
    const response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    return { status: response.status, body: text ? JSON.parse(text) : null }
  }

  return {
    baseUrl: ordersUrl,
    post: (path, body, token, options) =>
      request('POST', `${ordersUrl}${path}`, body, token, options?.idempotencyKey),
    put: (path, body, token) => request('PUT', `${ordersUrl}${path}`, body, token),
    get: (path, token) => request('GET', `${ordersUrl}${path}`, undefined, token),
    getCoupon: (path, token) => request('GET', `${couponsUrl}${path}`, undefined, token),
    getInventory: (path, token) => request('GET', `${inventoryUrl}${path}`, undefined, token),
    close: () => new Promise<void>((resolve) => {
      // Destroy any socket the pooled agent still holds, otherwise the server
      // never finishes closing and the test process cannot exit.
      server.closeAllConnections()
      server.close(() => resolve())
    }),
  }
}

/** A real access token for the given user, signed with the app's own secret. */
export function tokenFor(user: { _id: any; name?: string; email?: string; phone?: string; role?: string }) {
  return generateTokens({
    id: String(user._id),
    name: user.name ?? 'Test Customer',
    email: user.email ?? null,
    phone: user.phone ?? null,
    role: (user.role as 'ADMIN' | 'CUSTOMER') ?? 'CUSTOMER',
    tokenVersion: 0,
  }).accessToken
}
