/**
 * D25 Phase 8/9/10/16 — real POST /orders against real MongoDB.
 *
 * Every case drives the actual Express router over a real socket with a real
 * JWT, and every assertion re-reads the persisted state from MongoDB. Nothing
 * here asserts only on an HTTP status: the D23C invariant under test is that a
 * deterministically rejected request leaves the database byte-for-byte as it
 * found it, so each rejection asserts the actual ProductVariant.stock, the
 * actual order count and the actual item count.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { useIsolatedDatabase, commerceClient } from '../helpers/dbSuite'
import {
  TEST_IDS, UNIT_PRICE, objectIdFor,
  createCustomer, createAddress, createProduct, createVariant, createVariantWithoutPrice,
  createCoupon, enableServiceAreas, tokenFor,
} from '../helpers/commerce'
import { ProductVariant } from '../../src/models/productVariant.model'
import { Order, OrderItem } from '../../src/models/order.model'
import { Coupon } from '../../src/models/coupon.model'
import { Inventory } from '../../src/models/inventory.model'
import { InventoryLedgerEntry } from '../../src/models/inventoryLedger.model'

useIsolatedDatabase()

/** Reads the authoritative stock straight from MongoDB. */
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

/** A complete, valid COD order body. Individual tests override one field. */
function codBody(variantId: unknown, quantity = 1, extra: Record<string, unknown> = {}) {
  return {
    items: [{ variantId: String(variantId), quantity }],
    address: {
      name: 'Test Recipient',
      phone: '9876543210',
      addressLine1: 'TEST-ADDRESS-LINE-1',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: TEST_IDS.serviceablePin,
      country: 'IN',
    },
    paymentMethod: 'cod',
    ...extra,
  }
}

/**
 * The D23C two-pass invariant, asserted from the database and not from the
 * response body: whatever happened, the variant still holds exactly `expected`
 * units and no order/order-item rows were left behind.
 */
async function assertDatabaseUnchanged(expected: {
  stock: number
  soldCount?: number
  orders?: number
  items?: number
  variantId: unknown
}) {
  assert.equal(await stockOf(expected.variantId), expected.stock, 'ProductVariant.stock must be unchanged')
  assert.equal(
    await soldCountOf(expected.variantId),
    expected.soldCount ?? 0,
    'ProductVariant.soldCount must be unchanged',
  )
  assert.equal(await Order.countDocuments({}), expected.orders ?? 0, 'no order row may exist')
  assert.equal(await OrderItem.countDocuments({}), expected.items ?? 0, 'no order item row may exist')
}

describe('POST /orders — valid COD order persists correctly (Phase 8.1)', () => {
  it('creates the order, its items, and decrements stock exactly once', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const response = await commerceClient().post('/', codBody(variant._id, 2), tokenFor(customer))

    assert.equal(response.status, 201)

    const orders = await Order.find({}).lean()
    assert.equal(orders.length, 1)
    assert.equal(orders[0].paymentMethod, 'cod')
    assert.equal(orders[0].paymentGateway, 'cod')
    assert.equal(orders[0].paymentStatus, 'PENDING')
    assert.equal(orders[0].status, 'PENDING')
    assert.equal(orders[0].stockRestored, false)
    assert.equal(orders[0].couponRestored, false)

    // Totals come from the real calculation: 2 x 100 subtotal, 18% tax,
    // shipping 99 because the subtotal is below the 999 free-shipping threshold.
    assert.equal(orders[0].subtotal, 200)
    assert.equal(orders[0].tax, 36)
    assert.equal(orders[0].shipping, 99)
    assert.equal(orders[0].total, 335)

    const items = await OrderItem.find({ orderId: orders[0]._id }).lean()
    assert.equal(items.length, 1)
    assert.equal(items[0].quantity, 2)
    assert.equal(items[0].price, UNIT_PRICE)
    assert.equal(items[0].total, 200)
    assert.equal(items[0].restored, false)

    // The authoritative inventory state, read back from MongoDB.
    assert.equal(await stockOf(variant._id), 8, 'stock 10 - 2 = 8')
    assert.equal(await soldCountOf(variant._id), 2)

    const ledger = await InventoryLedgerEntry.find({ variantId: variant._id }).lean()
    assert.equal(ledger.length, 1, 'exactly one inventory movement must be recorded')
    assert.equal(ledger[0].delta, -2)
    assert.equal(ledger[0].reason, 'ORDER_PLACED')
  })

  it('never oversells: ordering more than the available stock is rejected without side effects', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 1 })

    const response = await commerceClient().post('/', codBody(variant._id, 5), tokenFor(customer))

    assert.equal(response.status, 400)
    await assertDatabaseUnchanged({ stock: 1, variantId: variant._id })
  })
})

describe('POST /orders — deterministic rejections leak no stock (Phase 8.2-8.7, Phase 9)', () => {
  it('2. invalid variant id is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 4 })

    const response = await commerceClient().post('/', codBody(objectIdFor('variant2')), tokenFor(customer))

    assert.equal(response.status, 400)
    assert.match(response.body.message, /not available/i)
    await assertDatabaseUnchanged({ stock: 4, variantId: variant._id })
  })

  it('2b. a garbage variant id is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 4 })

    const response = await commerceClient().post('/', codBody('not-an-object-id'), tokenFor(customer))

    assert.equal(response.status, 400)
    await assertDatabaseUnchanged({ stock: 4, variantId: variant._id })
  })

  it('2c. an inactive variant is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 4, isActive: false })

    const response = await commerceClient().post('/', codBody(variant._id), tokenFor(customer))

    assert.equal(response.status, 400)
    await assertDatabaseUnchanged({ stock: 4, variantId: variant._id })
  })

  it('3. a quantity above the per-item maximum is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 50 })

    const response = await commerceClient().post('/', codBody(variant._id, 11), tokenFor(customer))

    assert.equal(response.status, 400)
    assert.match(response.body.message, /maximum of 10/i)
    await assertDatabaseUnchanged({ stock: 50, variantId: variant._id })
  })

  it('4. a variant with no usable price is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variantId = await createVariantWithoutPrice({ productId: product._id, stock: 6 })

    const response = await commerceClient().post('/', codBody(variantId), tokenFor(customer))

    assert.equal(response.status, 400)
    assert.match(response.body.message, /pricing data unavailable/i)
    await assertDatabaseUnchanged({ stock: 6, variantId })
  })

  it('5. a malformed inline address is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { address: { ...codBody(variant._id).address, pincode: '12345' } }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.match(response.body.message, /6-digit PIN/i)
    await assertDatabaseUnchanged({ stock: 3, variantId: variant._id })
  })

  it('5b. a missing delivery address is rejected and stock is untouched', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })

    const response = await commerceClient().post(
      '/',
      { items: [{ variantId: String(variant._id), quantity: 1 }], paymentMethod: 'cod' },
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    await assertDatabaseUnchanged({ stock: 3, variantId: variant._id })
  })

  it("6. another customer's saved address is rejected and stock is untouched", async () => {
    const customer = await createCustomer()
    const other = await createCustomer('otherCustomer')
    const foreignAddress = await createAddress(other._id)
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })

    const response = await commerceClient().post(
      '/',
      { items: [{ variantId: String(variant._id), quantity: 1 }], addressId: String(foreignAddress._id), paymentMethod: 'cod' },
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.match(response.body.message, /invalid delivery address/i)
    await assertDatabaseUnchanged({ stock: 3, variantId: variant._id })
  })

  it('7. a non-serviceable PIN is rejected and stock is untouched', async () => {
    await enableServiceAreas()
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })
    const address = await createAddress(customer._id, TEST_IDS.nonServiceablePin)

    const response = await commerceClient().post(
      '/',
      { items: [{ variantId: String(variant._id), quantity: 1 }], addressId: String(address._id), paymentMethod: 'cod' },
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.match(response.body.message, new RegExp(TEST_IDS.nonServiceablePin))
    await assertDatabaseUnchanged({ stock: 3, variantId: variant._id })
  })

  it('7b. a serviceable PIN inside a configured area is accepted', async () => {
    await enableServiceAreas()
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 3 })
    const address = await createAddress(customer._id, TEST_IDS.serviceablePin)

    const response = await commerceClient().post(
      '/',
      { items: [{ variantId: String(variant._id), quantity: 1 }], addressId: String(address._id), paymentMethod: 'cod' },
      tokenFor(customer),
    )

    assert.equal(response.status, 201)
    assert.equal(await stockOf(variant._id), 2)
  })
})

describe('POST /orders — coupon handling (Phase 8.8-8.9) — records ACTUAL behaviour', () => {
  it('8. an unknown coupon code is ignored, not rejected: the order is created at full price', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: 'NO-SUCH-COUPON-CODE' }),
      tokenFor(customer),
    )

    // RECORDED BEHAVIOUR, not the behaviour the D25 brief assumed: the route
    // silently ignores an unresolvable coupon instead of rejecting the order.
    assert.equal(response.status, 201)
    const order = await Order.findOne({}).lean()
    assert.equal(order!.couponId, null)
    assert.equal(order!.couponDiscount, 0)
    assert.equal(order!.total, 217, 'full price: 100 subtotal + 18 tax + 99 shipping')
    assert.equal(await stockOf(variant._id), 4, 'stock is consumed exactly once, as for any other COD order')
  })

  it('9. a coupon whose minimum is not met is ignored, not rejected', async () => {
    await createCoupon({ code: TEST_IDS.coupon, minOrderAmount: 10000 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 201)
    const order = await Order.findOne({}).lean()
    assert.equal(order!.couponId, null)
    assert.equal(order!.couponDiscount, 0)
  })

  it('9b. a coupon restricted to other products is ignored, not rejected', async () => {
    await createCoupon({
      code: TEST_IDS.coupon,
      applicableTo: 'PRODUCTS',
      applicableProductIds: [String(objectIdFor('product2'))],
    })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 201)
    assert.equal((await Order.findOne({}).lean())!.couponDiscount, 0)
  })

  it('9c. an applicable coupon is consumed atomically and discounted exactly once', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 201)
    const order = await Order.findOne({}).lean()
    assert.equal(String(order!.couponId), String(coupon._id))
    assert.equal(order!.couponDiscount, 10, '10% of a 100 subtotal')
    assert.equal(order!.total, 207, '100 + 18 tax + 99 shipping - 10 coupon')
    assert.equal((await ProductVariant.findById(variant._id).lean())!.stock, 4)
    assert.equal(await couponUsedCount(coupon._id), 1, 'the coupon usage count is consumed exactly once')
  })

  it('9d. an exhausted coupon is ignored rather than rejected, and its count is not incremented', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 1, usedCount: 1 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 201)
    assert.equal((await Order.findOne({}).lean())!.couponDiscount, 0)
    assert.equal(await couponUsedCount(coupon._id), 1, 'usedCount must not move when the coupon is skipped')
    assert.equal(await stockOf(variant._id), 4)
  })
})

/** Reads a coupon's persisted usage count straight from MongoDB. */
async function couponUsedCount(couponId: unknown): Promise<number> {
  const coupon = await Coupon.findById(couponId as any).lean()
  return coupon?.usedCount ?? -1
}

describe('POST /orders — duplicate submission guard (Phase 8.10, Phase 9)', () => {
  it('10. an identical resubmission within the window is refused with 409 and consumes no further stock', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const first = await commerceClient().post('/', codBody(variant._id, 1), tokenFor(customer))
    assert.equal(first.status, 201)

    // Capture the post-first-order state; the duplicate must not move it.
    const stockAfterFirst = await stockOf(variant._id)
    const soldAfterFirst = await soldCountOf(variant._id)

    const second = await commerceClient().post('/', codBody(variant._id, 1), tokenFor(customer))

    assert.equal(second.status, 409)
    assert.match(second.body.message, /duplicate/i)
    assert.equal(await Order.countDocuments({}), 1, 'no second order may exist')
    assert.equal(await OrderItem.countDocuments({}), 1, 'no second order item may exist')
    assert.equal(await stockOf(variant._id), stockAfterFirst, 'stock must not move on a duplicate')
    assert.equal(await soldCountOf(variant._id), soldAfterFirst)
  })

  it('10b. the guard does not block a genuinely different cart from the same customer', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

    const first = await commerceClient().post('/', codBody(variant1._id, 1), tokenFor(customer))
    assert.equal(first.status, 201)

    const second = await commerceClient().post('/', codBody(variant2._id, 1), tokenFor(customer))
    assert.equal(second.status, 201, 'a different variant is a different order and must be allowed')
    assert.equal(await Order.countDocuments({}), 2)
    assert.equal(await stockOf(variant1._id), 9)
    assert.equal(await stockOf(variant2._id), 9)
  })
})

describe('POST /orders — multi-variant orders and staged rollback (Phase 10)', () => {
  it('decrements every variant by its own quantity and totals the order correctly', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 5, kind: 'variant2' })

    const response = await commerceClient().post('/', {
      items: [
        { variantId: String(variant1._id), quantity: 2 },
        { variantId: String(variant2._id), quantity: 3 },
      ],
      address: codBody(variant1._id).address,
      paymentMethod: 'cod',
    }, tokenFor(customer))

    assert.equal(response.status, 201)
    assert.equal(await stockOf(variant1._id), 8, 'variant 1: 10 - 2')
    assert.equal(await stockOf(variant2._id), 2, 'variant 2: 5 - 3')
    assert.equal(await soldCountOf(variant1._id), 2)
    assert.equal(await soldCountOf(variant2._id), 3)

    const order = await Order.findOne({}).lean()
    assert.equal(order!.subtotal, 500, '2 x 100 + 3 x 100')
    assert.equal(order!.tax, 90, '18% of 500')
    assert.equal(order!.shipping, 99, 'below the 999 free-shipping threshold')
    assert.equal(order!.total, 689)

    const items = await OrderItem.find({ orderId: order!._id }).lean()
    assert.equal(items.length, 2)
    assert.deepEqual(items.map((i) => i.quantity).sort(), [2, 3])
    assert.equal(await OrderItem.countDocuments({}), 2)
  })

  it('a failing second claim rolls the first one back: no stock leak and no orphan order', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 10, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 1, kind: 'variant2' })

    const response = await commerceClient().post('/', {
      items: [
        { variantId: String(variant1._id), quantity: 2 },
        { variantId: String(variant2._id), quantity: 5 },
      ],
      address: codBody(variant1._id).address,
      paymentMethod: 'cod',
    }, tokenFor(customer))

    assert.equal(response.status, 400)
    assert.match(response.body.message, /insufficient stock/i)

    // The critical D23C assertion: variant A's successful claim was released,
    // variant B was never decremented, and nothing was persisted.
    assert.equal(await stockOf(variant1._id), 10, 'variant A must be fully restored, not left decremented')
    assert.equal(await stockOf(variant2._id), 1, 'variant B must be untouched')
    assert.equal(await soldCountOf(variant1._id), 0)
    assert.equal(await soldCountOf(variant2._id), 0)
    assert.equal(await Order.countDocuments({}), 0, 'no orphan order may exist')
    assert.equal(await OrderItem.countDocuments({}), 0, 'no orphan order item may exist')
  })

  it('a failing first claim never touches the second variant at all', async () => {
    const customer = await createCustomer()
    const product1 = await createProduct('product1')
    const product2 = await createProduct('product2')
    const variant1 = await createVariant({ productId: product1._id, stock: 1, kind: 'variant1' })
    const variant2 = await createVariant({ productId: product2._id, stock: 10, kind: 'variant2' })

    const response = await commerceClient().post('/', {
      items: [
        { variantId: String(variant1._id), quantity: 4 },
        { variantId: String(variant2._id), quantity: 1 },
      ],
      address: codBody(variant1._id).address,
      paymentMethod: 'cod',
    }, tokenFor(customer))

    assert.equal(response.status, 400)
    assert.equal(await stockOf(variant1._id), 1)
    assert.equal(await stockOf(variant2._id), 10, 'the second variant must never be reached')
    assert.equal(await Order.countDocuments({}), 0)
  })

  it('a coupon claim is released when the stock claim then fails', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 1 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 5, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.equal(await stockOf(variant._id), 1)
    assert.equal(await couponUsedCount(coupon._id), 0, 'the coupon claim must be released, not leaked')
    assert.equal(await Order.countDocuments({}), 0)
  })
})

describe('inventory consistency after checkout (Phase 16)', () => {
  it('ProductVariant.stock stays authoritative while the Inventory mirror tracks its own delta', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    await commerceClient().post('/', codBody(variant._id, 3), tokenFor(customer))

    assert.equal(await stockOf(variant._id), 7, 'ProductVariant.stock is the authoritative value')

    // The mirror is a separate, independently-maintained counter. Recorded so
    // the divergence is visible rather than mistaken for the source of truth.
    const mirror = await Inventory.findOne({ variantId: variant._id }).lean()
    assert.equal(mirror!.quantity, -3, 'the mirror is not seeded from ProductVariant.stock in this flow')

    const ledger = await InventoryLedgerEntry.find({ variantId: variant._id }).lean()
    assert.equal(ledger.reduce((sum, row) => sum + row.delta, 0), -3)
  })

  it('stock of exactly zero is reachable but never goes negative', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 1 })

    const response = await commerceClient().post('/', codBody(variant._id, 1), tokenFor(customer))

    assert.equal(response.status, 201)
    assert.equal(await stockOf(variant._id), 0)
  })
})
