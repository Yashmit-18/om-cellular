import { Order } from '../models/order.model'
import { generateOrderNumber } from '../utils/helpers'
import { isOrderNumberCollision } from './idempotency.service'

/**
 * Attempts allowed before giving up on a colliding order number. A collision is
 * a ~1-in-900k event per draw, so a handful of retries is generous; the bound
 * exists so a pathological collision cannot spin.
 */
const MAX_NUMBER_ATTEMPTS = 3

/**
 * Inserts an order, regenerating `orderNumber` when — and only when — the
 * database rejects it as a duplicate.
 *
 * The caller supplies every other field. `orderNumber` is deliberately assigned
 * inside the loop rather than before it: the insert is the only step that can
 * discover a collision, so pre-drawing the number outside the loop would pin
 * every retry to the same already-taken value and guarantee repeated failure.
 *
 * Only unique violations of the orderNumber index are retried. An idempotency
 * collision and any unrelated database error propagate immediately so their
 * dedicated handlers stay reachable, and exhaustion rethrows so the caller's
 * existing compensation runs and no half-built order is left behind.
 */
export async function createOrderWithUniqueNumber(
  base: Record<string, any>,
  maxAttempts: number = MAX_NUMBER_ATTEMPTS,
) {
  let lastCollision: unknown = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await Order.create({ ...base, orderNumber: generateOrderNumber() })
    } catch (error) {
      if (!isOrderNumberCollision(error)) throw error
      lastCollision = error
    }
  }

  throw lastCollision
}
