/**
 * D28 — true checkout idempotency and order-write hardening against real MongoDB.
 *
 * Every case drives the real Express router over a real socket with a real JWT
 * and a real `Idempotency-Key` header, and every assertion re-reads the persisted
 * state from MongoDB. Nothing is stubbed on the database side: the concurrency
 * cases resolve because a real unique index rejects the losing inserts, not
 * because of any timing, sleep or in-process lock.
 *
 * Where a response payload is asserted for a *losing* concurrent request, only
 * the order identity is asserted. The winner inserts its order row before its
 * item rows, so a loser that reads in that interval would legitimately see the
 * order with its items not yet written. The database is the authority on what
 * was persisted, so the item assertions read the collection directly.
 *
 * SCOPE LIMIT: this proves behaviour of the tested unique index and guarded
 * updates in a single-node isolated environment. It is not evidence about
 * production topology, replica-set behaviour, or production-scale contention.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { useIsolatedDatabase, commerceClient } from '../helpers/dbSuite'
import {
  TEST_IDS, createCustomer, createProduct, createVariant, createCoupon, tokenFor, newIdempotencyKey,
} from '../helpers/commerce'
import { ProductVariant } from '../../src/models/productVariant.model'
import { Order, OrderItem } from '../../src/models/order.model'
import { Coupon } from '../../src/models/coupon.model'

useIsolatedDatabase()

const COD_ADDRESS = {
  name: 'Test Recipient',
  phone: '9876543210',
  addressLine1: 'TEST-ADDRESS-LINE-1',
  city: 'Mumbai',
  state: 'Maharashtra',
  pincode: TEST_IDS.serviceablePin,
  country: 'IN',
}

function codBody(variantId: unknown, quantity = 1, extra: Record<string, unknown> = {}) {
  return {
    items: [{ variantId: String(variantId), quantity }],
    address: { ...COD_ADDRESS },
    paymentMethod: 'cod',
    ...extra,
  }
}

async function stockOf(variantId: unknown): Promise<number> {
  const variant = await ProductVariant.findById(variantId as any).lean()
  assert.ok(variant, 'variant must still exist')
  return variant!.stock
}

async function soldCountOf(variantId: unknown): Promise<number> {
  const variant = await ProductVariant.findById(variantId as any).lean()
  assert.ok(variant, 'variant must still exist')
  return variant!.soldCount
}

function orderIdOf(response: { body: any }): string {
  return String(response.body.data.id || response.body.data._id)
}

/**
 * Fires N genuinely simultaneous checkouts for the SAME key and returns every
 * response. Started together on one tick so they overlap inside the server.
 */
async function raceCheckout(count: number, key: string, body: unknown, token: string) {
  return Promise.all(
    Array.from({ length: count }, () => commerceClient().post('/', body, token, { idempotencyKey: key })),
  )
}

/**
 * Maps a 6-digit order number back to a `Math.random()` value that produces it.
 *
 * `generateOrderNumber` computes `floor(100000 + random * 900000)`, so the
 * value is chosen from the middle of the target's bucket. Solving for the exact
 * lower edge instead would be off by one under floating point and would silently
 * produce a number that never actually collides — making the test pass without
 * ever exercising the retry.
 */
function randomValueForOrderDigits(digits: number): number {
  return (digits - 100000 + 0.5) / 900000
}

/** A 6-digit number guaranteed to differ from the given one. */
function differentOrderDigits(digits: number): number {
  return 100000 + (((digits - 100000) + 123_456) % 900_000)
}

describe('D28 — Idempotency-Key contract', () => {
  it('accepts a valid v4 key, persists it, and echoes it back', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const key = newIdempotencyKey()

    const response = await commerceClient().post('/', codBody(variant._id, 2), tokenFor(customer), { idempotencyKey: key })

    assert.equal(response.status, 201)
    const stored = await Order.findById(orderIdOf(response)).lean()
    assert.equal(stored!.idempotencyKey, key, 'the key must be persisted with the order')
    assert.equal(await stockOf(variant._id), 8, 'stock moves exactly once')
  })

  it('rejects a missing key with 400 and changes nothing', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const response = await commerceClient().post('/', codBody(variant._id, 1), tokenFor(customer), { idempotencyKey: null })

    assert.equal(response.status, 400)
    assert.match(response.body.message, /Idempotency-Key header is required/)
    assert.equal(await stockOf(variant._id), 10, 'no stock may move')
    assert.equal(await Order.countDocuments({}), 0, 'no order may exist')
    assert.equal(await OrderItem.countDocuments({}), 0, 'no item may exist')
  })

  it('rejects malformed, non-v4 and unpadded keys with 400 and changes nothing', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)

    const rejected = [
      'not-a-uuid',
      '',                                   // present but empty
      '   ',                                // whitespace only
      '550e8400-e29b-11d4-a716-446655440000',  // valid v1, wrong version nibble
      '550e8400e29b41d4a716446655440000',      // unhyphenated
      '550e8400-e29b-41d4-c716-446655440000',  // bad variant nibble
      '550e8400-e29b-41d4-a716-44665544000',   // too short
    ]

    for (const key of rejected) {
      const response = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key })
      assert.equal(response.status, 400, `expected 400 for ${JSON.stringify(key)}, got ${response.status}`)
      assert.match(response.body.message, /must be a valid UUID v4/)
    }

    assert.equal(await stockOf(variant._id), 10, 'no rejected request may move stock')
    assert.equal(await Order.countDocuments({}), 0, 'no rejected request may create an order')
  })

  it('normalises an upper-case key so casing cannot fork one attempt into two orders', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)
    const key = newIdempotencyKey()

    const first = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key })
    const second = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key.toUpperCase() })

    assert.equal(first.status, 201)
    assert.equal(second.status, 200, 'the upper-case form is the same attempt')
    assert.equal(orderIdOf(second), orderIdOf(first))
    assert.equal(await Order.countDocuments({}), 1, 'casing must not create a second order')
    assert.equal(await stockOf(variant._id), 9, 'stock moves exactly once')
  })
})

describe('D28 — replay semantics', () => {
  it('replays a repeated submit of the same key without repeating any effect', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)
    const key = newIdempotencyKey()

    const first = await commerceClient().post('/', codBody(variant._id, 3), token, { idempotencyKey: key })
    const second = await commerceClient().post('/', codBody(variant._id, 3), token, { idempotencyKey: key })
    const third = await commerceClient().post('/', codBody(variant._id, 3), token, { idempotencyKey: key })

    assert.equal(first.status, 201)
    assert.equal(second.status, 200)
    assert.equal(third.status, 200)
    assert.equal(second.body.replayed, true)
    for (const response of [second, third]) {
      assert.equal(orderIdOf(response), orderIdOf(first), 'a retry must resolve to the original order')
    }

    assert.equal(await Order.countDocuments({}), 1, 'exactly one order')
    assert.equal(await OrderItem.countDocuments({}), 1, 'exactly one item set')
    assert.equal(await stockOf(variant._id), 7, 'quantity 3 consumed once, not three times')
    assert.equal(await soldCountOf(variant._id), 3)
  })

  it('replays even after the cart is empty, proving the key and not the body decides', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)
    const key = newIdempotencyKey()

    const first = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key })
    // A retry whose body is now invalid must still return the original order
    // rather than a validation error; otherwise a lost response would leave the
    // customer with an unknown checkout outcome and no way to recover it.
    const retry = await commerceClient().post('/', { items: [], address: COD_ADDRESS }, token, { idempotencyKey: key })

    assert.equal(first.status, 201)
    assert.equal(retry.status, 200, 'a completed attempt replays regardless of the retried body')
    assert.equal(orderIdOf(retry), orderIdOf(first))
    assert.equal(await Order.countDocuments({}), 1)
    assert.equal(await stockOf(variant._id), 9)
  })

  it('keeps replaying indefinitely, long after the 5s fingerprint window has expired', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)
    const key = newIdempotencyKey()

    const first = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key })
    assert.equal(first.status, 201)

    // Age the order past DUPLICATE_GUARD_WINDOW_MS instead of sleeping, so the
    // test stays fast and deterministic.
    await Order.updateOne(
      { _id: orderIdOf(first) },
      { $set: { createdAt: new Date(Date.now() - 60_000) } },
    )

    const later = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key })
    assert.equal(later.status, 200, 'idempotency is permanent; only the fingerprint is time-boxed')
    assert.equal(orderIdOf(later), orderIdOf(first))
    assert.equal(await Order.countDocuments({}), 1)
    assert.equal(await stockOf(variant._id), 9, 'still consumed exactly once')
  })

  it('treats a different key as a genuinely new order', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)

    const first = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: newIdempotencyKey() })
    // Different quantity, so this is unambiguously a different purchase and not
    // a retry of the first.
    const second = await commerceClient().post('/', codBody(variant._id, 2), token, { idempotencyKey: newIdempotencyKey() })

    assert.equal(first.status, 201)
    assert.equal(second.status, 201, 'a new key must never be replayed')
    assert.notEqual(orderIdOf(second), orderIdOf(first))
    assert.equal(await Order.countDocuments({}), 2)
    assert.equal(await OrderItem.countDocuments({}), 2)
    assert.equal(await stockOf(variant._id), 7, 'both orders consume their own stock')
  })
})

describe('D28 — cross-user isolation', () => {
  it('never lets one customer reach another customer\'s order via a shared key', async () => {
    const customerA = await createCustomer('customer')
    const customerB = await createCustomer('otherCustomer')
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const key = newIdempotencyKey()

    // Distinct address data per customer, so a leak of A's order into B's
    // response is actually detectable rather than masked by shared fixtures.
    const addressA = { ...COD_ADDRESS, name: 'Alice Only', phone: '9000000001', addressLine1: 'A-ADDRESS-ONLY' }
    const addressB = { ...COD_ADDRESS, name: 'Bob Only', phone: '9000000002', addressLine1: 'B-ADDRESS-ONLY' }

    const forA = await commerceClient().post('/', codBody(variant._id, 1, { address: addressA }), tokenFor(customerA), { idempotencyKey: key })
    const forB = await commerceClient().post('/', codBody(variant._id, 1, { address: addressB }), tokenFor(customerB), { idempotencyKey: key })

    assert.equal(forA.status, 201)
    assert.notEqual(orderIdOf(forB), orderIdOf(forA), 'B must never be served A\'s order')

    // The unique index is scoped by userId, so B legitimately places its own
    // order rather than colliding with A's.
    const orderB = await Order.findById(orderIdOf(forB)).lean()
    assert.equal(String(orderB!.userId), String(customerB._id))
    assert.equal(orderB!.idempotencyKey, key)

    // Nothing of A's may appear in B's response.
    const serialised = JSON.stringify(forB.body)
    for (const secret of [addressA.phone, addressA.addressLine1, addressA.name, orderIdOf(forA)]) {
      assert.ok(!serialised.includes(secret), `B's response must not contain A's data (${secret})`)
    }
    assert.ok(serialised.includes(addressB.addressLine1), 'B sees their own address')

    assert.equal(await Order.countDocuments({}), 2)
    assert.equal(await stockOf(variant._id), 8, 'each order consumes its own stock')
  })

  it('keeps a replay scoped to the submitting customer', async () => {
    const customerA = await createCustomer('customer')
    const customerB = await createCustomer('otherCustomer')
    const product = await createProduct()
    const variantA = await createVariant({ productId: product._id, stock: 5 })
    const variantB = await createVariant({ productId: product._id, stock: 5, kind: 'variant2' })
    const key = newIdempotencyKey()

    const forA = await commerceClient().post('/', codBody(variantA._id, 1), tokenFor(customerA), { idempotencyKey: key })
    // Same key, different customer, different cart: still B's own order.
    const forB = await commerceClient().post('/', codBody(variantB._id, 1), tokenFor(customerB), { idempotencyKey: key })
    // A's own retry must resolve to A's order, never to B's.
    const retryA = await commerceClient().post('/', codBody(variantA._id, 1), tokenFor(customerA), { idempotencyKey: key })

    assert.equal(forA.status, 201)
    assert.equal(forB.status, 201)
    assert.equal(retryA.status, 200)
    assert.equal(orderIdOf(retryA), orderIdOf(forA), 'A replays A\'s order')
    assert.notEqual(orderIdOf(retryA), orderIdOf(forB))
    assert.equal(await stockOf(variantA._id), 4)
    assert.equal(await stockOf(variantB._id), 4)
  })
})

describe('D28 — concurrent retries collapse onto one order', () => {
  for (const racers of [2, 3, 5]) {
    it(`collapses ${racers} simultaneous retries of one key onto exactly one order`, async () => {
      const customer = await createCustomer()
      const product = await createProduct()
      const variant = await createVariant({ productId: product._id, stock: 20 })
      const key = newIdempotencyKey()

      const responses = await raceCheckout(racers, key, codBody(variant._id, 2), tokenFor(customer))

      const created = responses.filter(r => r.status === 201)
      const replayed = responses.filter(r => r.status === 200)
      assert.equal(created.length, 1, `exactly one winner, got statuses ${responses.map(r => r.status).join(',')}`)
      assert.equal(replayed.length, racers - 1, 'every loser replays rather than erroring')
      for (const response of replayed) {
        assert.equal(orderIdOf(response), orderIdOf(created[0]), 'every loser resolves to the winner\'s order')
      }

      // The database is the authority on what was persisted.
      assert.equal(await Order.countDocuments({}), 1, 'exactly one order')
      assert.equal(await OrderItem.countDocuments({}), 1, 'exactly one item set')
      assert.equal(await stockOf(variant._id), 18, 'quantity 2 consumed once, not once per racer')
      assert.equal(await soldCountOf(variant._id), 2)
    })
  }

  it('releases the losing racer\'s coupon claim so usage is counted once', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 20 })
    const coupon = await createCoupon({ usageLimit: 5 })
    const key = newIdempotencyKey()

    const responses = await raceCheckout(3, key, codBody(variant._id, 1, { couponCode: coupon.code }), tokenFor(customer))

    assert.equal(responses.filter(r => r.status === 201).length, 1)
    assert.equal(responses.filter(r => r.status === 200).length, 2)
    assert.equal(await Order.countDocuments({}), 1)

    const stored = await Coupon.findById(coupon._id).lean()
    assert.equal(stored!.usedCount, 1, 'the coupon must be consumed once, not once per racer')
    assert.equal(await stockOf(variant._id), 19, 'the losers rolled their own claims back')
    assert.equal(await soldCountOf(variant._id), 1)
  })

  it('never leaves an orphan order or item behind after a collapsed race', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 20 })
    const key = newIdempotencyKey()

    await raceCheckout(5, key, codBody(variant._id, 2), tokenFor(customer))

    const orders = await Order.find({}).lean()
    const items = await OrderItem.find({}).lean()
    assert.equal(orders.length, 1)
    assert.equal(items.length, 1)
    assert.equal(String(items[0].orderId), String(orders[0]._id), 'the item belongs to the surviving order')
    assert.equal(await Order.countDocuments({ idempotencyKey: key }), 1, 'exactly one row holds the key')
  })
})

describe('D28 — online payment retry keeps one order', () => {
  it('replays the same order when an unpaid gateway attempt is retried', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const token = tokenFor(customer)
    const key = newIdempotencyKey()
    const online = codBody(variant._id, 1, { paymentMethod: 'online' })

    // The order is created before the gateway opens, and the cart is not cleared
    // until payment succeeds. A customer who dismisses the gateway and retries
    // therefore re-submits with the SAME attempt key.
    const first = await commerceClient().post('/', online, token, { idempotencyKey: key })
    const retry = await commerceClient().post('/', online, token, { idempotencyKey: key })

    assert.equal(first.status, 201)
    assert.equal(retry.status, 200)
    assert.equal(orderIdOf(retry), orderIdOf(first))
    assert.equal(await Order.countDocuments({}), 1, 'a failed payment must not have produced a second order')
    assert.equal(await stockOf(variant._id), 9)

    const stored = await Order.findById(orderIdOf(first)).lean()
    assert.equal(stored!.paymentStatus, 'PENDING_PAYMENT', 'the order stays pending until the gateway confirms')
  })
})

describe('D28 — orderNumber collision hardening', () => {
  it('regenerates a colliding order number and still creates exactly one order', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    // A real order to collide against, on its own variant.
    const taken = await createVariant({ productId: product._id, stock: 5 })
    const product2 = await createProduct('product2')
    const fresh = await createVariant({ productId: product2._id, stock: 5, kind: 'variant2' })

    const first = await commerceClient().post('/', codBody(taken._id, 1), tokenFor(customer), { idempotencyKey: newIdempotencyKey() })
    assert.equal(first.status, 201)

    // Reproduce the number the first order already occupies, so the second
    // order's insert genuinely collides with a real unique-index violation.
    const takenNumber = (await Order.findById(orderIdOf(first)).lean())!.orderNumber
    const takenDigits = Number(takenNumber.split('-')[2])
    const originalRandom = Math.random
    let draws = 0
    Math.random = () => {
      draws += 1
      // First draw reproduces the taken number; later draws move on.
      return draws === 1
        ? randomValueForOrderDigits(takenDigits)
        : randomValueForOrderDigits(differentOrderDigits(takenDigits))
    }

    try {
      const second = await commerceClient().post('/', codBody(fresh._id, 1), tokenFor(customer), { idempotencyKey: newIdempotencyKey() })
      assert.equal(second.status, 201, 'a colliding number must be retried, not surfaced as an error')
      assert.equal(draws, 2, 'exactly one regeneration should have been needed')
    } finally {
      Math.random = originalRandom
    }

    assert.equal(await Order.countDocuments({}), 2, 'both orders exist')
    const numbers = (await Order.find({}).lean()).map(o => o.orderNumber)
    assert.equal(new Set(numbers).size, 2, 'the retry produced a distinct number')
    assert.equal(await stockOf(fresh._id), 4, 'the retried order consumed its own stock')
  })

  it('gives up after bounded retries and compensates instead of leaving a half order', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const taken = await createVariant({ productId: product._id, stock: 5 })
    const product2 = await createProduct('product2')
    const fresh = await createVariant({ productId: product2._id, stock: 5, kind: 'variant2' })

    const first = await commerceClient().post('/', codBody(taken._id, 1), tokenFor(customer), { idempotencyKey: newIdempotencyKey() })
    const takenNumber = (await Order.findById(orderIdOf(first)).lean())!.orderNumber
    const takenDigits = Number(takenNumber.split('-')[2])
    const originalRandom = Math.random
    let draws = 0
    // Every draw reproduces the taken number, so all attempts collide.
    Math.random = () => { draws += 1; return randomValueForOrderDigits(takenDigits) }

    let response: { status: number; body: any }
    try {
      response = await commerceClient().post('/', codBody(fresh._id, 1), tokenFor(customer), { idempotencyKey: newIdempotencyKey() })
    } finally {
      Math.random = originalRandom
    }

    assert.equal(response.status, 500, 'exhausted retries fail loudly rather than looping')
    assert.equal(draws, 3, 'the retry is bounded at three attempts')
    assert.equal(await Order.countDocuments({}), 1, 'no order from the failed attempt survives')
    assert.equal(await OrderItem.countDocuments({}), 1, 'only the first order\'s item exists')
    assert.equal(await stockOf(fresh._id), 5, 'the failed attempt released its stock claim')
    assert.equal(await soldCountOf(fresh._id), 0)

    // The pre-existing order is untouched: the failing attempt must never
    // discard an order it did not create.
    const survivor = await Order.findById(orderIdOf(first)).lean()
    assert.ok(survivor, 'the unrelated first order must survive')
    assert.equal(survivor!.orderNumber, takenNumber)
  })
})

/**
 * The smallest order the schema will accept. Used to stand in for rows written
 * before the idempotency key existed, without going through checkout (which
 * always supplies a key now).
 */
function minimalOrder(userId: unknown, orderNumber: string, extra: Record<string, unknown> = {}) {
  return Order.create({ userId, orderNumber, subtotal: 0, total: 0, ...extra })
}

describe('D28 — partial unique index shape', () => {
  it('declares the key index unique and partial on a non-empty string', async () => {
    const indexes = await Order.collection.indexes()
    const index = indexes.find(entry => entry.name === 'uniq_user_idempotency_key')
    assert.ok(index, 'the idempotency index must exist so the database can arbitrate the race')
    assert.equal(index!.unique, true, 'uniqueness is what makes concurrent retries collapse')
    assert.deepEqual(
      index!.partialFilterExpression,
      { idempotencyKey: { $type: 'string', $gt: '' } },
      'the index must stay partial so rows without a key are not constrained',
    )
  })

  it('leaves historical orders that carry no key free to coexist', async () => {
    const customer = await createCustomer()
    // Rows written before the key existed have no idempotencyKey. A plain unique
    // index would treat each missing key as the same value and reject all but
    // one of them, which is exactly the historical-data breakage the partial
    // filter exists to prevent.
    for (let i = 0; i < 3; i += 1) {
      await minimalOrder(customer._id, `OMC-2026-LEGACY0${i}`)
    }

    assert.equal(await Order.countDocuments({}), 3, 'orders without a key must not collide with each other')
    const legacy = await Order.find({ idempotencyKey: { $exists: false } }).lean()
    assert.equal(legacy.length, 3)
  })

  it('still constrains a repeated key for the same user', async () => {
    const customer = await createCustomer()
    const key = newIdempotencyKey()
    await minimalOrder(customer._id, 'OMC-2026-KEYONE1', { idempotencyKey: key })

    await assert.rejects(
      () => minimalOrder(customer._id, 'OMC-2026-KEYONE2', { idempotencyKey: key }),
      (error: any) => {
        assert.equal(error.code, 11000, 'the database, not the application, must reject the second row')
        return true
      },
    )
    assert.equal(await Order.countDocuments({ idempotencyKey: key }), 1)
  })
})

describe('D28 — existing rejections stay leak-free under the new contract', () => {
  it('leaves stock, orders and items untouched when a keyed request is rejected', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })
    const token = tokenFor(customer)
    const key = newIdempotencyKey()

    // More than the variant holds, and a fresh key that is never persisted
    // because the request is rejected deterministically.
    const response = await commerceClient().post('/', codBody(variant._id, 99), token, { idempotencyKey: key })

    assert.equal(response.status, 400)
    assert.equal(await stockOf(variant._id), 3, 'stock must be untouched')
    assert.equal(await soldCountOf(variant._id), 0)
    assert.equal(await Order.countDocuments({}), 0)
    assert.equal(await OrderItem.countDocuments({}), 0)

    // The rejected key was never consumed, so it is still usable for a valid
    // attempt rather than being silently burned.
    const retry = await commerceClient().post('/', codBody(variant._id, 1), token, { idempotencyKey: key })
    assert.equal(retry.status, 201)
    assert.equal(await stockOf(variant._id), 2)
  })
})
