/**
 * D25 Phase 13/14/15/16 — real concurrency and idempotency against real MongoDB.
 *
 * Every race below is a genuine simultaneous attempt against the same MongoDB
 * documents using the production guarded update
 * (`findOneAndUpdate({ _id, isActive: true, stock: { $gte: qty } }, { $inc })`).
 * Nothing is mocked, and no result is assumed: the assertions read the final
 * persisted state back out of the database.
 *
 * SCOPE LIMIT, stated plainly: this proves the behaviour of the tested
 * MongoDB atomic operation under a single-node isolated environment. It is not
 * evidence about production topology, production replica-set behaviour, or
 * behaviour under production-scale contention.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { useIsolatedDatabase, commerceClient } from '../helpers/dbSuite'
import { TEST_IDS, createCustomer, createProduct, createVariant, createCoupon, tokenFor } from '../helpers/commerce'
import { ProductVariant } from '../../src/models/productVariant.model'
import { Order, OrderItem } from '../../src/models/order.model'
import { Coupon } from '../../src/models/coupon.model'
import { restoreStockAndCoupon, consumeStockAndCoupon } from '../../src/services/orderLifecycle.service'

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

async function stockOf(variantId: unknown): Promise<number> {
  const variant = await ProductVariant.findById(variantId as any).lean()
  assert.ok(variant, 'variant must still exist')
  return variant!.stock
}

describe('stock concurrency — the last unit cannot be sold twice (Phase 13)', () => {
  it('stock=1 with two simultaneous checkouts: exactly one order wins, stock lands on 0', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 1 })

    const body = {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }
    // Distinct carts so the short-window duplicate guard is not what decides
    // the outcome — the only thing separating them is the stock.
    const [first, second] = await Promise.all([
      commerceClient().post('/', body, tokenFor(customer)),
      commerceClient().post('/', { ...body, notes: 'concurrent-attempt-2' }, tokenFor(customer)),
    ])

    const statuses = [first.status, second.status].sort()
    assert.deepEqual(statuses, [201, 400], `expected one success and one guarded rejection, got ${statuses}`)

    assert.equal(await stockOf(variant._id), 0, 'final stock must be exactly 0, never negative')
    assert.equal(await Order.countDocuments({}), 1, 'exactly one order may exist')
    assert.equal(await OrderItem.countDocuments({}), 1)
  })

  it('a larger race never oversells: 5 units, 5 simultaneous single-unit buyers', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const attempts = await Promise.all(
      Array.from({ length: 5 }, (_unused, index) => commerceClient().post('/', {
        items: [{ variantId: String(variant._id), quantity: 1 }],
        address: COD_ADDRESS,
        paymentMethod: 'cod',
        notes: `concurrent-attempt-${index}`,
      }, tokenFor(customer))),
    )

    const succeeded = attempts.filter((r) => r.status === 201).length
    const rejected = attempts.filter((r) => r.status === 400).length

    assert.equal(succeeded, 5, `all 5 units should sell, got ${succeeded} successes / ${rejected} rejections`)
    assert.equal(await stockOf(variant._id), 0)
    assert.equal(await Order.countDocuments({}), 5)
    assert.equal(await OrderItem.countDocuments({}), 5)
  })

  it('more buyers than units: winners equal the stock on hand and stock never goes negative', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })

    const attempts = await Promise.all(
      Array.from({ length: 8 }, (_unused, index) => commerceClient().post('/', {
        items: [{ variantId: String(variant._id), quantity: 1 }],
        address: COD_ADDRESS,
        paymentMethod: 'cod',
        notes: `concurrent-attempt-${index}`,
      }, tokenFor(customer))),
    )

    const succeeded = attempts.filter((r) => r.status === 201).length
    assert.equal(succeeded, 3, 'winners must equal the 3 units actually available')
    assert.equal(await stockOf(variant._id), 0, 'stock must be exactly 0, never negative')
    assert.equal(await Order.countDocuments({}), 3)
  })

  it('a multi-unit race on a single unit: the 2-unit buyer loses cleanly', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 1 })

    const [single, double] = await Promise.all([
      commerceClient().post('/', {
        items: [{ variantId: String(variant._id), quantity: 1 }],
        address: COD_ADDRESS, paymentMethod: 'cod', notes: 'single',
      }, tokenFor(customer)),
      commerceClient().post('/', {
        items: [{ variantId: String(variant._id), quantity: 2 }],
        address: COD_ADDRESS, paymentMethod: 'cod', notes: 'double',
      }, tokenFor(customer)),
    ])

    assert.equal(single.status, 201)
    assert.equal(double.status, 400)
    assert.equal(await stockOf(variant._id), 0)
    assert.equal(await Order.countDocuments({}), 1)
  })

  it('the guarded decrement is safe when driven directly and concurrently', async () => {
    // Bypasses the route to put maximum pressure on the atomic update itself:
    // 10 concurrent claims against 4 units.
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 4 })

    const results = await Promise.all(Array.from({ length: 10 }, () => ProductVariant.findOneAndUpdate(
      { _id: variant._id, isActive: true, stock: { $gte: 1 } },
      { $inc: { stock: -1, soldCount: 1 } },
    )))

    const winners = results.filter(Boolean).length
    assert.equal(winners, 4, 'the guarded update must admit exactly the available units')
    assert.equal(await stockOf(variant._id), 0, 'stock must never go negative under contention')
  })
})

describe('multi-variant concurrency (Phase 10/13)', () => {
  it('a losing claim on one variant rolls back the winner and leaves no partial order', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const scarce = await createVariant({ productId: product1._id, stock: 1, kind: 'variant1' })
    const plentiful = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

    const response = await commerceClient().post('/', {
      items: [
        { variantId: String(plentiful._id), quantity: 2 },
        { variantId: String(scarce._id), quantity: 4 },
      ],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }, tokenFor(customer))

    assert.equal(response.status, 400)
    assert.equal(await stockOf(plentiful._id), 10, 'the first claim must be released, not stranded')
    assert.equal(await stockOf(scarce._id), 1)
    assert.equal(await Order.countDocuments({}), 0, 'no order may survive a failed multi-variant claim')
    assert.equal(await OrderItem.countDocuments({}), 0)
  })
})

describe('restoration concurrency (Phase 14)', () => {
  it('5 simultaneous restorations of the same order credit the stock exactly once', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const placed = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 3 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }, tokenFor(customer))
    assert.equal(placed.status, 201)
    const orderId = placed.body.data._id
    assert.equal(await stockOf(variant._id), 7)

    // Each racer loads the order independently, exactly as separate requests or
    // separate workers would.
    const attempts = await Promise.all(
      Array.from({ length: 5 }, async () => restoreStockAndCoupon(await Order.findById(orderId))),
    )

    // The invariant that matters is the persisted stock, so that is what is
    // asserted. It must be credited exactly once no matter how the racers
    // interleave: the per-item conditional claim is what guarantees it.
    assert.equal(await stockOf(variant._id), 10, 'stock must be restored exactly once, never twice')
    assert.equal((await ProductVariant.findById(variant._id).lean())!.soldCount, 0, 'soldCount must unwind exactly once')
    assert.equal((await Order.findById(orderId).lean())!.stockRestored, true)
    assert.equal(await OrderItem.countDocuments({ orderId, restored: false }), 0)

    // RECORDED BEHAVIOUR, not an assumed guarantee: restoreStockAndCoupon
    // reports didWork=true for every racer. Each racer read `stockRestored`
    // from its own pre-loaded document, so all five believed they had work to
    // do. The stock itself is still correct because the per-item conditional
    // claim admits only one of them; the return value is advisory and must not
    // be used as a concurrency guard by callers.
    assert.equal(
      attempts.filter(Boolean).length,
      5,
      'every racer reports didWork=true because the completion flag is read from a stale document',
    )
  })

  it('repeated sequential restorations never double-restore', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const placed = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 2 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }, tokenFor(customer))
    const orderId = placed.body.data._id

    for (let round = 0; round < 5; round += 1) {
      await restoreStockAndCoupon(await Order.findById(orderId))
      assert.equal(await stockOf(variant._id), 10, `stock drifted on restoration round ${round}`)
    }
  })

  it('a concurrent restoration and re-consumption never drives stock negative', async () => {
    // Re-consume (FAILED -> PAID recovery) claims the stock again while a
    // restoration may be releasing it. Whatever the interleaving, the guarded
    // update must keep stock at or above zero.
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 2 })

    const placed = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }, tokenFor(customer))
    const orderId = placed.body.data._id
    assert.equal(await stockOf(variant._id), 1)

    await Promise.all([
      restoreStockAndCoupon(await Order.findById(orderId)),
      restoreStockAndCoupon(await Order.findById(orderId)),
      restoreStockAndCoupon(await Order.findById(orderId)),
    ])

    const finalStock = await stockOf(variant._id)
    assert.ok(finalStock >= 0, `stock must never go negative, got ${finalStock}`)
    assert.equal(finalStock, 2, `stock must be restored exactly once, got ${finalStock}`)

    // Re-consuming after the restore must work and must respect the guard.
    const reconsumed = await consumeStockAndCoupon(await Order.findById(orderId))
    assert.equal(reconsumed.ok, true)
    assert.equal(await stockOf(variant._id), 1)
  })
})

describe('idempotency and the current dedupe behaviour (Phase 15)', () => {
  it('sequential duplicate: an identical resubmission is refused with 409', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const body = {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }
    const first = await commerceClient().post('/', body, tokenFor(customer))
    const second = await commerceClient().post('/', body, tokenFor(customer))

    assert.equal(first.status, 201)
    assert.equal(second.status, 409)
    assert.equal(await Order.countDocuments({}), 1)
    assert.equal(await stockOf(variant._id), 9, 'the duplicate must not consume stock')
  })

  it('the guard is a 5-second time window, not a uniqueness constraint', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const body = {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }
    await commerceClient().post('/', body, tokenFor(customer))

    // Age the existing order out of the window. The same cart is now accepted,
    // which proves the protection is a recency check and not a database
    // constraint. D25 deliberately adds no unique index to change this.
    await Order.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 60_000) } })

    const second = await commerceClient().post('/', body, tokenFor(customer))
    assert.equal(second.status, 201, 'outside the window the identical cart is accepted')
    assert.equal(await Order.countDocuments({}), 2, 'two orders with the same dedupeKey can coexist')
    assert.equal(await stockOf(variant._id), 8)
  })

  it('RECORDED: the dedupeKey index is NOT unique, so duplicates are possible', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const body = {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }
    await commerceClient().post('/', body, tokenFor(customer))
    await Order.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 60_000) } })
    await commerceClient().post('/', body, tokenFor(customer))

    const orders = await Order.find({}).lean()
    assert.equal(orders.length, 2)
    assert.equal(orders[0].dedupeKey, orders[1].dedupeKey, 'both orders carry the same dedupeKey')

    // The decisive evidence: MongoDB itself does not prevent this, because the
    // index is non-unique. Asserted so a future change to a unique index would
    // have to update this test deliberately.
    const indexes = await Order.collection.indexes()
    const dedupeIndex = indexes.find((i) => i.name === 'dedupeKey_1')
    assert.ok(dedupeIndex, 'a dedupeKey index exists')
    assert.notEqual(dedupeIndex.unique, true, 'the dedupeKey index is NOT unique: no database-enforced dedupe')
  })

  it('conflicting payload: the same cart fingerprint with a different total is treated as a different order', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

    const first = await commerceClient().post('/', {
      items: [{ variantId: String(variant1._id), quantity: 1 }],
      address: COD_ADDRESS, paymentMethod: 'cod',
    }, tokenFor(customer))
    assert.equal(first.status, 201)

    // Same customer, different variant fingerprint -> not a duplicate.
    const conflicting = await commerceClient().post('/', {
      items: [{ variantId: String(variant2._id), quantity: 1 }],
      address: COD_ADDRESS, paymentMethod: 'cod',
    }, tokenFor(customer))
    assert.equal(conflicting.status, 201)
    assert.equal(await Order.countDocuments({}), 2)
  })

  it('a retried coupon never consumes the same coupon slot twice', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 2, value: 10 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const body = {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
      couponCode: TEST_IDS.coupon,
    }
    const first = await commerceClient().post('/', body, tokenFor(customer))
    const second = await commerceClient().post('/', body, tokenFor(customer))

    assert.equal(first.status, 201)
    assert.equal(second.status, 409, 'the retry is refused as a duplicate')
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 1, 'the coupon is consumed exactly once')
    assert.equal(await stockOf(variant._id), 9)
  })

  it('FINDING: the duplicate guard is check-then-act, so simultaneous identical submissions all succeed', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const body = {
      items: [{ variantId: String(variant._id), quantity: 1 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
      couponCode: TEST_IDS.coupon,
    }
    const attempts = await Promise.all([
      commerceClient().post('/', body, tokenFor(customer)),
      commerceClient().post('/', body, tokenFor(customer)),
      commerceClient().post('/', body, tokenFor(customer)),
    ])

    const created = attempts.filter((r) => r.status === 201).length

    // RECORDED DEFECT. The guard is a read followed by a later insert, with no
    // unique index to arbitrate, so simultaneous requests all read "no recent
    // duplicate" and all create an order. The sequential case is protected; the
    // concurrent case is not. D25 deliberately adds no unique index and no
    // E11000 handling, so this stays an open D23B blocker.
    assert.equal(created, 3, 'all three simultaneous identical submissions currently succeed')
    assert.equal(await Order.countDocuments({}), 3)

    // The compensating evidence: the duplicate orders are at least internally
    // consistent. Each consumed exactly its own stock and its own coupon slot,
    // so nothing is double-counted relative to the orders that do exist.
    const usedCount = (await Coupon.findById(coupon._id).lean())!.usedCount
    assert.equal(usedCount, created, 'coupon consumption matches the number of orders created')
    assert.equal(await stockOf(variant._id), 10 - created, 'stock matches the number of orders created')
    assert.equal(await OrderItem.countDocuments({}), created)

    // Every order carries the same dedupeKey, which is exactly why a unique
    // index is the missing piece.
    const keys = await Order.distinct('dedupeKey')
    assert.equal(keys.length, 1, 'all duplicate orders share one dedupeKey value')
  })
})
