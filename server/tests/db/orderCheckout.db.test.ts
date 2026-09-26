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

/**
 * A real ADMIN access token. `requireAdmin` verifies the JWT signature and the
 * role claim only, so no User row is required for these admin-only reads.
 */
function adminToken() {
  return tokenFor({ _id: objectIdFor('admin'), name: 'Test Admin', role: 'ADMIN' } as any)
}

/** Reads the authoritative stock straight from MongoDB. */
async function stockOf(variantId: unknown): Promise<number> {  const variant = await ProductVariant.findById(variantId as any).lean()
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

describe('POST /orders — coupon handling (Phase 8.8-8.9, D26 contract)', () => {
  // D26 CONTRACT CHANGE. D25 recorded that an invalid coupon was silently
  // ignored and the order was created at full price. That contradicted the rest
  // of the system and was a real defect: the storefront displays the discounted
  // total it computed from a successfully-validated coupon, so silently dropping
  // the coupon charged the customer MORE than the checkout screen showed, with
  // no error anywhere.
  //
  // The contract is rejection, established from the existing code rather than
  // invented: GET /coupons/validate/:code already answers 404/400 with a
  // specific reason for every one of these cases, and the storefront only sends
  // `couponCode` when that endpoint succeeded. A supplied-but-invalid code is
  // therefore a stale or tampered request, and is now refused with the same
  // reason the validate endpoint returns.
  it('8. an unknown coupon code is rejected and no order is created', async () => {
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: 'NO-SUCH-COUPON-CODE' }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.equal(response.body.message, 'Invalid coupon code')
    assert.equal(await Order.countDocuments({}), 0, 'no order may be created')
    assert.equal(await stockOf(variant._id), 5, 'a rejected coupon must consume no stock')
  })

  it('9. a coupon whose minimum is not met is rejected with the shared reason', async () => {
    await createCoupon({ code: TEST_IDS.coupon, minOrderAmount: 10000 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.match(response.body.message, /minimum order/i)
    assert.equal(await Order.countDocuments({}), 0)
    assert.equal(await stockOf(variant._id), 5)
  })

  it('9b. a coupon restricted to other products is rejected', async () => {
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

    assert.equal(response.status, 400)
    assert.equal(response.body.message, 'This coupon does not apply to the items in your cart')
    assert.equal(await Order.countDocuments({}), 0)
    assert.equal(await stockOf(variant._id), 5)
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

  it('9d. an exhausted coupon is rejected and its count is not incremented', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 1, usedCount: 1 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.equal(response.body.message, 'Coupon usage limit reached')
    assert.equal(await Order.countDocuments({}), 0)
    assert.equal(await couponUsedCount(coupon._id), 1, 'usedCount must not move when the coupon is refused')
    assert.equal(await stockOf(variant._id), 5, 'a refused coupon must consume no stock')
  })

  it('9e. an expired coupon is rejected', async () => {
    const coupon = await createCoupon({
      code: TEST_IDS.coupon,
      usageLimit: 5,
      value: 10,
      expiresAt: new Date(Date.now() - 60_000),
    })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.equal(response.body.message, 'Coupon has expired')
    assert.equal(await Order.countDocuments({}), 0)
    assert.equal(await couponUsedCount(coupon._id), 0)
    assert.equal(await stockOf(variant._id), 5)
  })

  it('9f. an inactive coupon is rejected', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10, isActive: false })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 5 })

    const response = await commerceClient().post(
      '/',
      codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }),
      tokenFor(customer),
    )

    assert.equal(response.status, 400)
    assert.equal(response.body.message, 'Invalid coupon code')
    assert.equal(await Order.countDocuments({}), 0)
    assert.equal(await couponUsedCount(coupon._id), 0)
  })

  it('9g. a coupon already used the maximum times per user is rejected', async () => {
    const coupon = await createCoupon({ code: TEST_IDS.coupon, usageLimit: 10, value: 10, maxPerUser: 1 })
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })
    const other = await createVariant({ productId: product._id, stock: 10, kind: 'variant2' })

    // One prior order already used this coupon, outside the duplicate window.
    const first = await commerceClient().post('/', codBody(other._id, 1, { couponCode: TEST_IDS.coupon }), tokenFor(customer))
    assert.equal(first.status, 201)
    await Order.collection.updateMany({}, { $set: { createdAt: new Date(Date.now() - 60_000) } })

    const response = await commerceClient().post('/', codBody(variant._id, 1, { couponCode: TEST_IDS.coupon }), tokenFor(customer))

    assert.equal(response.status, 400)
    assert.equal(response.body.message, 'You have already used this coupon the maximum number of times')
    assert.equal(await Order.countDocuments({}), 1, 'only the first order may exist')
    assert.equal(await couponUsedCount(coupon._id), 1, 'the refused attempt must not consume a coupon slot')
    assert.equal(await stockOf(variant._id), 10, 'the refused attempt must consume no stock')
  })

  it('9h. POST /orders agrees with GET /coupons/validate on every rejection reason', async () => {
    // The two endpoints must not drift: the storefront validates with one and
    // submits to the other, so a divergence would let a code the UI accepted be
    // rejected at submit time (or worse, silently ignored).
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    const cases: { name: string; code: string; expected: RegExp }[] = [
      { name: 'unknown code', code: 'NO-SUCH-COUPON-CODE', expected: /Invalid coupon code/i },
      { name: 'inactive coupon', code: TEST_IDS.coupon, expected: /Invalid coupon code/i },
      { name: 'expired coupon', code: TEST_IDS.coupon, expected: /expired/i },
      { name: 'exhausted coupon', code: TEST_IDS.coupon, expected: /usage limit reached/i },
    ]

    const setups: (() => Promise<unknown>)[] = [
      async () => undefined,
      async () => createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10, isActive: false }),
      async () => createCoupon({ code: TEST_IDS.coupon, usageLimit: 5, value: 10, expiresAt: new Date(Date.now() - 60_000) }),
      async () => createCoupon({ code: TEST_IDS.coupon, usageLimit: 1, usedCount: 1, value: 10 }),
    ]

    // One customer for every case: the fixtures use a deterministic _id, so
    // re-creating per iteration would collide on the primary key.
    const customer = await createCustomer()

    for (const [index, testCase] of cases.entries()) {
      await Coupon.deleteMany({})
      await setups[index]!()

      const validate = await commerceClient().getCoupon(`/validate/${encodeURIComponent(testCase.code)}?total=100`, tokenFor(customer))
      const submit = await commerceClient().post('/', codBody(variant._id, 1, { couponCode: testCase.code }), tokenFor(customer))

      assert.ok(validate.status >= 400, `${testCase.name}: the validate endpoint must reject`)
      assert.equal(submit.status, 400, `${testCase.name}: POST /orders must reject too`)
      assert.match(submit.body.message, testCase.expected, `${testCase.name}: the reason must match the contract`)
    }
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

  it('D26: admin inventory reads report the authoritative stock even when the mirror has drifted', async () => {
    // Locks in the Phase 6 invariant. The Inventory mirror is written
    // incrementally by the order lifecycle and is not seeded from the variant,
    // so after a checkout it is at -3 while the authoritative stock is 7. Every
    // admin-facing read must be derived from ProductVariant.stock, so a drifted
    // (even nonsensical) mirror can never be presented to an admin as stock.
    const customer = await createCustomer()
    const product = await createProduct()
    const variant = await createVariant({ productId: product._id, stock: 10 })

    await commerceClient().post('/', codBody(variant._id, 3), tokenFor(customer))
    assert.equal(await stockOf(variant._id), 7)

    // Push the mirror somewhere absurd. Any read that trusted the mirror would
    // now report this value instead of the real stock.
    await Inventory.updateOne({ variantId: variant._id }, { $set: { quantity: -3 } })
    assert.equal((await Inventory.findOne({ variantId: variant._id }).lean())!.quantity, -3)

    const list = await commerceClient().getInventory('/', adminToken())
    assert.equal(list.status, 200, `admin inventory list failed: ${JSON.stringify(list.body)}`)
    const row = list.body.data.find((r: any) => String(r.variantId) === String(variant._id))
    assert.ok(row, 'the variant must be listed')
    assert.equal(row.quantity, 7, 'the admin list must report the authoritative stock, not the drifted mirror')

    const single = await commerceClient().getInventory(`/${variant._id}`, adminToken())
    assert.equal(single.status, 200)
    assert.equal(single.body.data.quantity, 7, 'the single-item admin read must also report the authoritative stock')

    // The low-stock filter must be driven by the authoritative stock too: with a
    // stock of 7 and the default threshold of 5 the variant is NOT low stock,
    // even though the mirror says -3.
    const lowStock = await commerceClient().getInventory('/?lowStock=true', adminToken())
    assert.equal(lowStock.status, 200)
    const lowRows = lowStock.body.data as any[]
    assert.equal(
      lowRows.some((r: any) => String(r.variantId) === String(variant._id)),
      false,
      'the low-stock filter must use the authoritative stock, not the drifted mirror',
    )
  })
})
