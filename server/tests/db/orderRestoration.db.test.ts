/**
 * D25 Phase 11/12/16 â€” restoration and failure injection against real MongoDB.
 *
 * Orders are created through the REAL POST /orders route (so the stock that
 * restoration has to undo was genuinely claimed), and every assertion re-reads
 * ProductVariant.stock, the restoration flags and the order state from MongoDB
 * rather than trusting a returned boolean.
 *
 * Faults are injected with real MongoDB failpoints, so the failing component is
 * the database and the code under test is the unmodified production path.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { useIsolatedDatabase, commerceClient } from '../helpers/dbSuite'
import { armFailPoint, collectionNamespace } from '../helpers/mongodb'
import {
  TEST_IDS, objectIdFor,
  createCustomer, createProduct, createVariant, createCoupon, tokenFor,
} from '../helpers/commerce'
import { ProductVariant } from '../../src/models/productVariant.model'
import { Order, OrderItem } from '../../src/models/order.model'
import { Coupon } from '../../src/models/coupon.model'
import { restoreStockAndCoupon, sweepAbandonedPendingPayments } from '../../src/services/orderLifecycle.service'

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

function adminToken() {
  return tokenFor({ _id: objectIdFor('admin'), name: 'Test Admin', role: 'ADMIN' } as any)
}

/**
 * Asserts that the rejection is the genuine server error the failpoint
 * injected. Matched on the MongoDB error code rather than the message text so
 * the test cannot pass on an unrelated failure.
 */
function isInjectedWriteFailure(code: number) {
  return (error: any) => {
    assert.equal(error?.code, code, `expected the injected MongoDB error ${code}, got ${error?.code}: ${error?.message}`)
    return true
  }
}

async function stockOf(variantId: unknown): Promise<number> {
  const variant = await ProductVariant.findById(variantId as any).lean()
  assert.ok(variant, 'variant must still exist')
  return variant!.stock
}

async function soldCountOf(variantId: unknown): Promise<number> {
  return (await ProductVariant.findById(variantId as any).lean())!.soldCount
}

/**
 * Places a real order through the real route and returns its persisted state.
 * `paymentMethod: 'online'` produces the PENDING_PAYMENT status that the
 * abandoned-payment sweep looks for.
 */
async function placeOrder(options: {
  lines: { kind: 'variant1' | 'variant2'; quantity: number }[]
  couponCode?: string
  paymentMethod?: 'cod' | 'online'
}) {
  const customer = await createCustomer()
  const product1 = await createProduct('product1')
  const product2 = await createProduct('product2')
  const v1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
  const v2 = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

  const body: Record<string, unknown> = {
    items: options.lines.map((line) => ({
      variantId: String(line.kind === 'variant1' ? v1._id : v2._id),
      quantity: line.quantity,
    })),
    address: COD_ADDRESS,
    paymentMethod: options.paymentMethod ?? 'cod',
  }
  if (options.couponCode) body.couponCode = options.couponCode

  const response = await commerceClient().post('/', body, tokenFor(customer))
  assert.equal(response.status, 201, `order setup failed: ${JSON.stringify(response.body)}`)

  const order = await Order.findById(response.body.data._id).lean()
  assert.ok(order)
  return { order: order!, v1, v2, customer }
}

/** Marks a line as already restored, reproducing a prior run that died midway. */
async function simulateAlreadyRestoredLine(orderId: unknown, variantId: unknown, quantity: number) {
  const item = await OrderItem.findOne({ orderId: orderId as any, variantId: variantId as any }).lean()
  assert.ok(item, 'expected an order item for that variant')
  await OrderItem.updateOne({ _id: item!._id }, { $set: { restored: true } })
  await ProductVariant.updateOne({ _id: variantId as any }, { $inc: { stock: quantity, soldCount: -quantity } })
  await Order.updateOne({ _id: orderId as any }, { $set: { stockRestored: false } })
}

describe('restoration â€” complete success (Phase 11.1, Phase 8.5 cancellation)', () => {
  it('admin cancellation restores stock exactly once and records the restored state', async () => {
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 2 }] })
    assert.equal(await stockOf(v1._id), 8)

    const response = await commerceClient().put(`/${order._id}`, { status: 'CANCELLED' }, adminToken())

    assert.equal(response.status, 200)

    // The authoritative inventory value, read back from MongoDB.
    assert.equal(await stockOf(v1._id), 10, 'stock must return to its pre-order value exactly once')
    assert.equal(await soldCountOf(v1._id), 0)

    const after = await Order.findById(order._id).lean()
    assert.equal(after!.status, 'CANCELLED')
    assert.equal(after!.stockRestored, true, 'the completion flag must be persisted')
    assert.equal(after!.couponRestored, false, 'no coupon was attached, so the coupon flag stays false')

    const items = await OrderItem.find({ orderId: order._id }).lean()
    assert.equal(items[0].restored, true, 'the per-item idempotency marker must be persisted')
  })

  it('a multi-item order restores every variant by its own quantity', async () => {
    const { order, v1, v2 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 2 }, { kind: 'variant2', quantity: 3 }] })
    assert.equal(await stockOf(v1._id), 8)
    assert.equal(await stockOf(v2._id), 7)

    const response = await commerceClient().put(`/${order._id}`, { status: 'CANCELLED' }, adminToken())
    assert.equal(response.status, 200)

    assert.equal(await stockOf(v1._id), 10, 'variant 1: 8 + 2')
    assert.equal(await stockOf(v2._id), 10, 'variant 2: 7 + 3')
    assert.equal(await soldCountOf(v1._id), 0)
    assert.equal(await soldCountOf(v2._id), 0)
    assert.ok((await OrderItem.find({ orderId: order._id }).lean()).every((i) => i.restored))
  })
})

describe('restoration â€” idempotency and partial state (Phase 11.2-11.4)', () => {
  it('4. repeated restoration never double-restores the same order', async () => {
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 3 }] })
    assert.equal(await stockOf(v1._id), 7)

    const first = await restoreStockAndCoupon(await Order.findById(order._id))
    assert.deepEqual(first, { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 1, couponReleased: false })
    assert.equal(await stockOf(v1._id), 10)

    // A second attempt must be a no-op in the database, not a second refund of
    // stock. The persisted completion flag is what makes this safe.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const repeated = await restoreStockAndCoupon(await Order.findById(order._id))
      assert.deepEqual(
        repeated,
        { completed: true, performedByThisCall: false, alreadyCompleted: true, itemsRestored: 0, couponReleased: false },
        'a repeat restoration must report that it completed nothing and did the work earlier',
      )
      assert.equal(await stockOf(v1._id), 10, 'stock must stay at 10 across repeated attempts')
    }
  })

  it('2. a line already restored by a crashed earlier run is not restored again', async () => {
    const { order, v1, v2 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 2 }, { kind: 'variant2', quantity: 3 }] })
    assert.equal(await stockOf(v1._id), 8)
    assert.equal(await stockOf(v2._id), 7)

    // Reproduce a prior run that restored variant 2 and then died before it
    // could set the order-level completion flag.
    await simulateAlreadyRestoredLine(order._id, v2._id, 3)
    assert.equal(await stockOf(v2._id), 10)

    const result = await restoreStockAndCoupon(await Order.findById(order._id))

    // This call only credited the ONE line that was still outstanding.
    assert.deepEqual(result, { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 1, couponReleased: false })
    assert.equal(await stockOf(v1._id), 10, 'the un-restored line is completed')
    assert.equal(await stockOf(v2._id), 10, 'the already-restored line must not be credited twice')
    assert.equal(await soldCountOf(v1._id), 0)
    assert.equal(await soldCountOf(v2._id), 0)
  })
})

describe('restoration â€” coupon handling (Phase 11.8-11.9)', () => {
  it('8. coupon usage is released exactly once on cancellation', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 1 }], couponCode: TEST_IDS.coupon })

    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 1, 'checkout consumed the coupon once')
    assert.equal(await stockOf(v1._id), 9)

    await commerceClient().put(`/${order._id}`, { status: 'CANCELLED' }, adminToken())

    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 0, 'the coupon is released')
    assert.equal(await stockOf(v1._id), 10)
    const after = await Order.findById(order._id).lean()
    assert.equal(after!.stockRestored, true)
    assert.equal(after!.couponRestored, true, 'both completion flags must be persisted')
  })

  it('9. stock and coupon are restored together and repeated attempts do not double-release', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 2 }], couponCode: TEST_IDS.coupon })
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 1)

    assert.deepEqual(await restoreStockAndCoupon(await Order.findById(order._id)), { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 1, couponReleased: true })
    assert.equal(await stockOf(v1._id), 10)
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 0)

    for (let attempt = 0; attempt < 3; attempt += 1) {
      assert.deepEqual(await restoreStockAndCoupon(await Order.findById(order._id)), { completed: true, performedByThisCall: false, alreadyCompleted: true, itemsRestored: 0, couponReleased: false })
    }
    assert.equal(await stockOf(v1._id), 10, 'no double restoration')
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 0, 'the coupon cannot go negative')
  })
})

describe('restoration â€” abandoned pending payment sweep (Phase 11.5)', () => {
  it('cancels an abandoned online payment and restores its stock and coupon', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const { order, v1 } = await placeOrder({
      lines: [{ kind: 'variant1', quantity: 2 }],
      couponCode: TEST_IDS.coupon,
      paymentMethod: 'online',
    })
    assert.equal(order.paymentStatus, 'PENDING_PAYMENT')
    assert.equal(await stockOf(v1._id), 8)
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 1)

    // Age the order past the sweep window.
    const aged = new Date(Date.now() - 60 * 60 * 1000)
    await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: aged } })

    const metrics = await sweepAbandonedPendingPayments(new Date())

    assert.equal(metrics.scanned, 1)
    assert.equal(metrics.cancelled, 1)
    assert.equal(metrics.stockRestored, 1)
    assert.equal(metrics.couponsReleased, 1)
    assert.equal(metrics.errors, 0)

    assert.equal(await stockOf(v1._id), 10)
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 0)
    const after = await Order.findById(order._id).lean()
    assert.equal(after!.status, 'CANCELLED')
    assert.equal(after!.stockRestored, true)
  })

  it('a second sweep over the same order restores nothing further', async () => {
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 1 }], paymentMethod: 'online' })
    await Order.collection.updateOne({ _id: order._id }, { $set: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } })

    await sweepAbandonedPendingPayments(new Date())
    assert.equal(await stockOf(v1._id), 10)

    const second = await sweepAbandonedPendingPayments(new Date())
    assert.equal(second.scanned, 0, 'the order is no longer in the eligible state')
    assert.equal(await stockOf(v1._id), 10, 'no double restoration on a repeat sweep')
  })
})

describe('restoration â€” payment failure and return (Phase 11.6-11.7)', () => {
  it('6. a failed online payment releases the reserved stock exactly once', async () => {
    // Boundary note: the gateway webhook envelope is signed with the Razorpay
    // webhook secret, which this suite must not hold or fabricate. The
    // production function the webhook calls is therefore driven directly
    // against a real persisted order â€” real models, real MongoDB, real writes.
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 2 }], paymentMethod: 'online' })
    assert.equal(await stockOf(v1._id), 8)

    await Order.updateOne({ _id: order._id }, { $set: { paymentStatus: 'FAILED', status: 'FAILED' } })

    assert.deepEqual(await restoreStockAndCoupon(await Order.findById(order._id)), { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 1, couponReleased: false })
    assert.equal(await stockOf(v1._id), 10)

    assert.deepEqual(await restoreStockAndCoupon(await Order.findById(order._id)), { completed: true, performedByThisCall: false, alreadyCompleted: true, itemsRestored: 0, couponReleased: false })
    assert.equal(await stockOf(v1._id), 10, 'a repeat after payment failure must not double-restore')
  })

  it('7. a received return restores stock with the RETURN_RECEIVED reason', async () => {
    const { order, v1, v2 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 1 }, { kind: 'variant2', quantity: 4 }] })
    assert.equal(await stockOf(v1._id), 9)
    assert.equal(await stockOf(v2._id), 6)

    // The returns route guards on the same persisted flag, so the flag is what
    // this test relies on for repeat safety.
    assert.deepEqual(await restoreStockAndCoupon(await Order.findById(order._id), 'RETURN_RECEIVED'), { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 2, couponReleased: false })

    assert.equal(await stockOf(v1._id), 10)
    assert.equal(await stockOf(v2._id), 10)
    const after = await Order.findById(order._id).lean()
    assert.equal(after!.stockRestored, true)
  })
})

describe('restoration â€” real database failure injection (Phase 11.10, Phase 12)', () => {
  it('10. a write failure during restoration leaves nothing half-done and the order fully retryable', async () => {
    const { order, v1, v2 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 2 }, { kind: 'variant2', quantity: 3 }] })
    assert.equal(await stockOf(v1._id), 8)
    assert.equal(await stockOf(v2._id), 7)

    const clear = await armFailPoint({
      namespace: collectionNamespace(ProductVariant),
      failCommands: ['findAndModify'],
      times: 1,
    })

    await assert.rejects(
      (async () => restoreStockAndCoupon(await Order.findById(order._id))) as any,
      isInjectedWriteFailure(112),
    )
    await clear()

    // The failure propagates instead of being swallowed, the order does not
    // claim completion, and the half-claimed line is released so a retry can
    // pick it up again.
    const midway = await Order.findById(order._id).lean()
    assert.equal(midway!.stockRestored, false, 'a failed restoration must not claim completion')
    const midwayItems = await OrderItem.find({ orderId: order._id }).lean()
    assert.ok(
      midwayItems.every((i) => i.restored === false),
      'no line may be left marked restored after a failed write',
    )
    assert.equal(await stockOf(v1._id), 8, 'the failed line must not have been credited')
    assert.equal(await stockOf(v2._id), 7, 'the untouched line must stay untouched')

    // 3. The retry then finishes the whole job.
    const retried = await restoreStockAndCoupon(await Order.findById(order._id))
    assert.deepEqual(retried, { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 2, couponReleased: false })

    assert.equal(await stockOf(v1._id), 10, 'variant 1 restored exactly once')
    assert.equal(await stockOf(v2._id), 10, 'variant 2 restored exactly once')
    assert.equal(await soldCountOf(v1._id), 0)
    assert.equal(await soldCountOf(v2._id), 0)
    assert.equal((await Order.findById(order._id).lean())!.stockRestored, true)
    assert.ok((await OrderItem.find({ orderId: order._id }).lean()).every((i) => i.restored))
  })

  it('a coupon write failure during restoration leaves the coupon claim retryable', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const { order, v1 } = await placeOrder({ lines: [{ kind: 'variant1', quantity: 1 }], couponCode: TEST_IDS.coupon })
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 1)

    const clear = await armFailPoint({
      namespace: collectionNamespace(Coupon),
      failCommands: ['findAndModify'],
      times: 1,
    })

    await assert.rejects(
      (async () => restoreStockAndCoupon(await Order.findById(order._id))) as any,
      isInjectedWriteFailure(112),
    )
    await clear()

    // The stock phase completed; the coupon claim must have been released so a
    // retry can still finish the job.
    const midway = await Order.findById(order._id).lean()
    assert.equal(midway!.stockRestored, true)
    assert.equal(midway!.couponRestored, false, 'a failed coupon release must not claim completion')
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 1, 'the coupon is still consumed')
    assert.equal(await stockOf(v1._id), 10)

    // The retry releases the coupon and does not touch stock again.
    assert.deepEqual(await restoreStockAndCoupon(await Order.findById(order._id)), { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 0, couponReleased: true })
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 0)
    assert.equal(await stockOf(v1._id), 10, 'stock must not be restored a second time')
    assert.equal((await Order.findById(order._id).lean())!.couponRestored, true)
  })

  it('a failed order insert rolls back the stock the request had already claimed', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    assert.equal(await stockOf(variant._id), 10)

    // Fail the order insert itself. The stock decrement has already happened by
    // this point, so this exercises the route's catch-block rollback.
    const clear = await armFailPoint({
      namespace: collectionNamespace(Order),
      failCommands: ['insert'],
      times: 1,
    })

    const response = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 2 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }, tokenFor(customer))
    await clear()

    assert.equal(response.status, 500)
    assert.equal(await stockOf(variant._id), 10, 'the claimed stock must be returned, not stranded')
    assert.equal(await soldCountOf(variant._id), 0)
    assert.equal(await Order.countDocuments({}), 0, 'no order row may survive')
    assert.equal(await OrderItem.countDocuments({}), 0)
  })

  it('D26: a failed order-item insert rolls back stock AND leaves no orphan order', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    // This failpoint fires after Order.create has already succeeded, so it
    // reproduces a failure between order persistence and item persistence.
    const clear = await armFailPoint({
      namespace: collectionNamespace(OrderItem),
      failCommands: ['insert'],
      times: 1,
    })

    const response = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 2 }],
      address: COD_ADDRESS,
      paymentMethod: 'cod',
    }, tokenFor(customer))
    await clear()

    assert.equal(response.status, 500)

    // The inventory guarantee holds: the claim is released, so there is no
    // stock leak and no phantom decrement.
    assert.equal(await stockOf(variant._id), 10, 'the claimed stock must be returned, not stranded')
    assert.equal(await soldCountOf(variant._id), 0)

    // D26 FIX. Previously this test asserted the opposite: the route rolled back
    // stock but left the already-inserted Order behind, so the customer ended up
    // with a real PENDING order that had no line items and held no stock. The
    // route now performs deterministic compensation, so an order that was never
    // acknowledged to the client is removed together with any partial items.
    assert.equal(await OrderItem.countDocuments({}), 0, 'no partial order item may survive')
    assert.equal(await Order.countDocuments({}), 0, 'the unacknowledged order must be discarded, not left as an orphan')

    // The strongest form of the defect: nothing that looks like a real order to
    // any reader may remain. Asserted directly rather than inferred from counts.
    const survivors = await Order.find({}).lean()
    assert.deepEqual(survivors, [], 'no order document may survive a failed item insert')
  })

  it('D26: compensation removes a partially-inserted order without touching a sibling order', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

    // A first, fully successful order establishes that unrelated orders must
    // survive the compensation path untouched.
    const survivor = await commerceClient().post('/', {
      items: [{ variantId: String(variant1._id), quantity: 1 }],
      address: COD_ADDRESS, paymentMethod: 'cod', notes: 'survivor',
    }, tokenFor(customer))
    assert.equal(survivor.status, 201)
    const survivorId = survivor.body.data._id

    // Now fail the SECOND item's insert. The first item is already persisted, so
    // this is the worst case: an order with a partial item set.
    const clear = await armFailPoint({
      namespace: collectionNamespace(OrderItem),
      failCommands: ['insert'],
      times: 1,
    })
    const second = await commerceClient().post('/', {
      items: [{ variantId: String(variant2._id), quantity: 1 }, { variantId: String(variant1._id), quantity: 1 }],
      address: COD_ADDRESS, paymentMethod: 'cod', notes: 'doomed',
    }, tokenFor(customer))
    await clear()
    assert.equal(second.status, 500)

    // Both claims are released, including the one for the already-inserted item.
    assert.equal(await stockOf(variant1._id), 9, 'only the surviving order may hold stock')
    assert.equal(await stockOf(variant2._id), 10)
    assert.equal(await soldCountOf(variant1._id), 1)
    assert.equal(await soldCountOf(variant2._id), 0)

    // The doomed order and its one persisted item are both gone; the unrelated
    // order and its item are untouched.
    const doomed = await Order.find({ notes: 'doomed' }).lean()
    assert.deepEqual(doomed, [], 'the partially-inserted order must be discarded')
    assert.equal(await OrderItem.countDocuments({ orderId: { $in: doomed.map((o: any) => o._id) } }), 0)

    const keptOrder = await Order.findById(survivorId).lean()
    assert.ok(keptOrder, 'an unrelated order must never be removed by compensation')
    assert.equal(await OrderItem.countDocuments({ orderId: survivorId }), 1)
  })

  it('D26: an order-item write failure rolls back stock AND coupon usage, leaving no orphan', async () => {
    // This is the full Phase 7 case: every side effect the request had already
    // committed must be undone, not just the stock. The coupon claim happens
    // BEFORE the stock claims, so by the time the item insert fails the request
    // holds both a coupon slot and two stock claims.
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

    const clear = await armFailPoint({
      namespace: collectionNamespace(OrderItem),
      failCommands: ['insert'],
      times: 1,
    })
    const response = await commerceClient().post('/', {
      items: [{ variantId: String(variant1._id), quantity: 2 }, { variantId: String(variant2._id), quantity: 3 }],
      address: COD_ADDRESS, paymentMethod: 'cod', couponCode: TEST_IDS.coupon,
    }, tokenFor(customer))
    await clear()
    assert.equal(response.status, 500)

    // Both stock claims are released.
    assert.equal(await stockOf(variant1._id), 10)
    assert.equal(await stockOf(variant2._id), 10)
    assert.equal(await soldCountOf(variant1._id), 0)
    assert.equal(await soldCountOf(variant2._id), 0)

    // And the coupon slot the request had already claimed is given back, so the
    // coupon is not silently burned by a request that never produced an order.
    assert.equal(
      (await Coupon.findById(coupon._id).lean())!.usedCount,
      0,
      'a coupon claimed by a request that then failed must be released',
    )

    // Nothing that looks like a real order survives.
    assert.deepEqual(await Order.find({}).lean(), [], 'no order document may survive')
    assert.equal(await OrderItem.countDocuments({}), 0, 'no partial order item may survive')
  })

  it('D26: a coupon claim that fails leaves no order, no stock movement and no coupon change', async () => {
    // The mirror image of the case above: fail the coupon write itself. The
    // claim happens before any stock is touched, so a correct route must abort
    // without having mutated anything at all.
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const clear = await armFailPoint({
      namespace: collectionNamespace(Coupon),
      failCommands: ['findAndModify'],
      times: 1,
    })
    const response = await commerceClient().post('/', {
      items: [{ variantId: String(variant._id), quantity: 2 }],
      address: COD_ADDRESS, paymentMethod: 'cod', couponCode: TEST_IDS.coupon,
    }, tokenFor(customer))
    await clear()
    assert.equal(response.status, 500)

    assert.equal(await stockOf(variant._id), 10, 'stock must be untouched when the coupon claim fails')
    assert.equal(await soldCountOf(variant._id), 0)
    assert.equal((await Coupon.findById(coupon._id).lean())!.usedCount, 0, 'the coupon count must not move')
    assert.deepEqual(await Order.find({}).lean(), [], 'no order may be created when the coupon claim fails')
    assert.equal(await OrderItem.countDocuments({}), 0)
  })
})
