import { Order } from '../models/order.model'

/** Canonical request header carrying the client-generated checkout key. */
export const IDEMPOTENCY_HEADER = 'Idempotency-Key'

/**
 * Strict RFC 4122 version 4 form. Version nibble is pinned to `4` and the
 * variant nibble to `8|9|a|b`, so a v1 UUID or arbitrary hex string is rejected
 * rather than silently accepted as an attempt identity.
 */
const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

const DUPLICATE_KEY_CODE = 11000

export type IdempotencyHeaderResult =
  | { ok: true; key: string }
  | { ok: false; reason: 'missing' | 'malformed' }

/**
 * Reads and validates the checkout key.
 *
 * A missing key is a 400, never a server-generated substitute: silently minting
 * one would make every repeat submit look like a brand new attempt and restore
 * exactly the duplicate-order bug this key exists to prevent.
 */
export function parseIdempotencyHeader(raw: unknown): IdempotencyHeaderResult {
  // "Never sent" and "sent but blank" are different client bugs and get
  // different messages, so they are classified separately.
  if (raw === undefined || raw === null) {
    return { ok: false, reason: 'missing' }
  }

  let value: string
  if (Array.isArray(raw)) {
    // Repeated headers are ambiguous; treat them as malformed rather than
    // guessing which one the client meant.
    if (raw.length !== 1) return { ok: false, reason: 'malformed' }
    value = String(raw[0])
  } else {
    value = String(raw)
  }

  const key = value.trim().toLowerCase()
  if (key === '' || !UUID_V4_PATTERN.test(key)) {
    return { ok: false, reason: 'malformed' }
  }
  return { ok: true, key }
}

/**
 * Looks up a prior order for this attempt.
 *
 * Always scoped to the authenticated user. That scoping is the cross-user
 * safety boundary: even if one customer submits a key another customer is also
 * using, the lookup can only ever return an order owned by the caller, so no
 * response can expose another user's order, totals, address or items.
 */
export async function findOrderByIdempotencyKey(
  userId: string,
  key: string,
) {
  return Order.findOne({ userId, idempotencyKey: key })
}

/** True when the error is a MongoDB unique-index violation. */
function isDuplicateKeyError(error: any): boolean {
  return error?.code === DUPLICATE_KEY_CODE
}

/**
 * The field names the database reported in the violated index.
 *
 * `keyPattern` is the authoritative source and is what the driver populates.
 * An empty result means it was unavailable, and the message is consulted instead.
 */
function duplicateKeyFields(error: any): string[] {
  const pattern = error?.keyPattern
  if (pattern && typeof pattern === 'object') {
    const fields = Object.keys(pattern)
    if (fields.length) return fields
  }
  return []
}

/**
 * The violated index name, reduced to bare lowercase alphanumerics.
 *
 * Index names are not the field names: this schema's indexes are explicitly
 * named (`uniq_user_idempotency_key`), so the name cannot simply be split on
 * separators to recover `idempotencyKey`. Stripping separators lets the field
 * be found as a substring instead.
 */
function normalizedIndexName(error: any): string {
  const message = String(error?.message || '')
  const named = message.match(/index:\s*([A-Za-z0-9_.-]+)/)
  return named ? named[1].toLowerCase().replace(/[^a-z0-9]/g, '') : ''
}

/** Whether the violated index covers the given field. */
function violationCoversField(error: any, field: string): boolean {
  const fields = duplicateKeyFields(error)
  if (fields.length) return fields.includes(field)
  return normalizedIndexName(error).includes(field.toLowerCase())
}

/**
 * True only for a violation of the (userId, idempotencyKey) unique index, i.e.
 * a genuine lost checkout race. Confined to the idempotency index so that an
 * orderNumber collision is never mistaken for a replayable attempt (and vice
 * versa), which would otherwise either swallow a real collision or replay an
 * order that does not exist.
 */
export function isIdempotencyKeyCollision(error: any): boolean {
  if (!isDuplicateKeyError(error)) return false
  return violationCoversField(error, 'idempotencyKey')
}

/**
 * True only for a violation of the unique orderNumber index.
 */
export function isOrderNumberCollision(error: any): boolean {
  if (!isDuplicateKeyError(error)) return false
  // A compound violation naming both fields is an idempotency collision; it must
  // never be retried by redrawing the order number, which would not help.
  if (violationCoversField(error, 'idempotencyKey')) return false
  return violationCoversField(error, 'orderNumber')
}
