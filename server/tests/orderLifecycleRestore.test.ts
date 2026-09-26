import { test } from 'node:test'
import assert from 'node:assert/strict'

import { restoreStockAndCoupon, type RestoreDependencies } from '../src/services/orderLifecycle.service'

interface FakeItem { _id: string; orderId: string; variantId: string; quantity: number; restored?: boolean }
interface FakeVariant { _id: string; stock: number }
interface FakeOrder { _id: string; stockRestored: boolean; couponRestored: boolean; couponId?: string | null }

function makeHarness(options: { order?: Partial<FakeOrder>; items?: FakeItem[]; variants?: FakeVariant[]; couponUsed?: number } = {}) {
  const state = {
    order: { _id: 'o1', stockRestored: false, couponRestored: false, couponId: null, ...options.order } as FakeOrder,
    items: (options.items || []).map(item => ({ restored: false, ...item })),
    variants: (options.variants || []).map(variant => ({ ...variant })),
    couponUsed: options.couponUsed ?? 0,
    log: [] as string[],
    applyFailure: {} as Record<string, Error>,
    couponFailure: undefined as Error | undefined,
  }

  const deps: RestoreDependencies = {
    findItems: async () => state.items.map(item => ({ ...item })),
    claimItem: async item => {
      const found = state.items.find(candidate => candidate._id === item._id && !candidate.restored)
      if (!found) return false
      found.restored = true
      state.log.push(`claim:${item._id}`)
      return true
    },
    applyItemRestore: async item => {
      const failure = state.applyFailure[item.variantId]
      if (failure) throw failure
      const variant = state.variants.find(candidate => candidate._id === item.variantId)!
      variant.stock += item.quantity
      state.log.push(`apply:${item._id}`)
    },
    unclaimItem: async item => {
      const found = state.items.find(candidate => candidate._id === item._id)
      if (found) found.restored = false
      state.log.push(`unclaim:${item._id}`)
    },
    completeStockRestoration: async () => {
      state.order.stockRestored = true
      state.log.push('complete:stock')
    },
    claimCoupon: async order => {
      if (!order.couponId || state.order.couponRestored) return false
      state.order.couponRestored = true
      state.log.push('claim:coupon')
      return true
    },
    releaseCouponUsage: async () => {
      if (state.couponFailure) throw state.couponFailure
      if (state.couponUsed > 0) {
        state.couponUsed -= 1
        state.log.push('release:coupon')
      }
    },
    unclaimCoupon: async () => {
      state.order.couponRestored = false
      state.log.push('unclaim:coupon')
    },
  }

  return {
    state,
    harness: {
      restore: () => restoreStockAndCoupon(state.order, 'ORDER_CANCELLED', deps),
      restoreOnce: async () => {
        state.log = []
        const result = await restoreStockAndCoupon(state.order, 'ORDER_CANCELLED', deps)
        return { result, ...state }
      },
    },
    deps,
  }
}

const twoItem = {
  items: [
    { _id: 'i1', orderId: 'o1', variantId: 'v1', quantity: 2 },
    { _id: 'i2', orderId: 'o1', variantId: 'v2', quantity: 3 },
  ],
  variants: [
    { _id: 'v1', stock: 10 },
    { _id: 'v2', stock: 20 },
  ],
}

test('restores every item once and marks stockRestored only after all items', async () => {
  const { state, harness } = makeHarness(twoItem)
  const { result } = await harness.restoreOnce()
  assert.deepEqual(result, { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 2, couponReleased: false })
  assert.equal(state.variants[0].stock, 12)
  assert.equal(state.variants[1].stock, 23)
  assert.equal(state.order.stockRestored, true)
  assert.deepEqual(state.log, ['claim:i1', 'apply:i1', 'claim:i2', 'apply:i2', 'complete:stock'])
})

test('mid-loop failure leaves stockRestored unset, reverts the claim, and retry completes', async () => {
  const { state, harness } = makeHarness(twoItem)
  state.applyFailure.v2 = new Error('variant v2 unreachable')
  await assert.rejects(harness.restore(), /variant v2 unreachable/)
  assert.equal(state.order.stockRestored, false)
  assert.equal(state.variants[0].stock, 12, 'item 1 was applied and kept')
  assert.equal(state.variants[1].stock, 20, 'item 2 was never applied')
  assert.deepEqual(state.log, ['claim:i1', 'apply:i1', 'claim:i2', 'unclaim:i2'])

  state.applyFailure = {}
  state.log = []
  await harness.restore()
  assert.equal(state.variants[0].stock, 12, 'item 1 must not be restored twice on retry')
  assert.equal(state.variants[1].stock, 23)
  assert.equal(state.order.stockRestored, true)
  assert.deepEqual(state.log, ['claim:i2', 'apply:i2', 'complete:stock'])
})

test('already-restored order returns false and performs no work', async () => {
  const { state, harness } = makeHarness({ ...twoItem, order: { _id: 'o1', stockRestored: true, couponRestored: false } })
  const { result } = await harness.restoreOnce()
  assert.deepEqual(result, { completed: true, performedByThisCall: false, alreadyCompleted: true, itemsRestored: 0, couponReleased: false })
  assert.equal(state.variants[0].stock, 10)
  assert.deepEqual(state.log, [])
})

test('previously restored items are skipped and remaining items complete', async () => {
  const { state, harness } = makeHarness(twoItem)
  state.items[0].restored = true
  const { result } = await harness.restoreOnce()
  assert.deepEqual(result, { completed: true, performedByThisCall: true, alreadyCompleted: false, itemsRestored: 1, couponReleased: false })
  assert.equal(state.variants[0].stock, 10, 'already-restored item untouched')
  assert.equal(state.variants[1].stock, 23)
  assert.equal(state.order.stockRestored, true)
  assert.deepEqual(state.log, ['claim:i2', 'apply:i2', 'complete:stock'])
})

test('coupon usage is released exactly once for an order with a coupon', async () => {
  const { state, harness } = makeHarness({ ...twoItem, order: { _id: 'o1', stockRestored: false, couponRestored: false, couponId: 'c1' }, couponUsed: 5 })
  await harness.restoreOnce()
  assert.equal(state.couponUsed, 4)
  assert.equal(state.order.couponRestored, true)
  assert.ok(state.log.indexOf('complete:stock') < state.log.indexOf('claim:coupon'), 'stock completes before coupon work')
  assert.ok(state.log.includes('release:coupon'))
})

test('coupon release error reverts the couponRestored claim and retry completes', async () => {
  const { state, harness } = makeHarness({ ...twoItem, order: { _id: 'o1', stockRestored: false, couponRestored: false, couponId: 'c1' }, couponUsed: 2 })
  state.couponFailure = new Error('coupon service down')
  await assert.rejects(harness.restore(), /coupon service down/)
  assert.equal(state.order.couponRestored, false)
  assert.equal(state.couponUsed, 2)

  state.couponFailure = undefined
  state.log = []
  await harness.restore()
  assert.equal(state.couponUsed, 1)
  assert.equal(state.order.couponRestored, true)
})

test('coupon already at zero is marked restored without underflow', async () => {
  const { state, harness } = makeHarness({ ...twoItem, order: { _id: 'o1', stockRestored: false, couponRestored: false, couponId: 'c1' }, couponUsed: 0 })
  await harness.restoreOnce()
  assert.equal(state.couponUsed, 0)
  assert.equal(state.order.couponRestored, true)
  assert.ok(!state.log.includes('release:coupon'))
})

test('order without a coupon is never coupon-marked', async () => {
  const { state, harness } = makeHarness(twoItem)
  await harness.restoreOnce()
  assert.equal(state.order.couponRestored, false)
  assert.ok(!state.log.includes('claim:coupon'))
})

test('repeated restore after success is a no-op', async () => {
  const { state, harness } = makeHarness({ ...twoItem, order: { _id: 'o1', stockRestored: false, couponRestored: false, couponId: 'c1' }, couponUsed: 1 })
  await harness.restoreOnce()
  // The second call did no work at all: the first call already released the
  // coupon, so `couponReleased` (which describes THIS call, like itemsRestored)
  // is false even though the coupon is settled.
  assert.deepEqual((await harness.restoreOnce()).result, { completed: true, performedByThisCall: false, alreadyCompleted: true, itemsRestored: 0, couponReleased: false })
  assert.equal(state.variants[0].stock, 12, 'second call must not restore again')
  assert.equal(state.variants[1].stock, 23)
  assert.equal(state.couponUsed, 0)
})

test('concurrent restorers cannot double-restore an item', async () => {
  const { state, harness } = makeHarness(twoItem)
  const results = await Promise.all([harness.restore(), harness.restore()])

  // D26: `performedByThisCall` is derived from mutations that were actually
  // applied (itemsRestored / couponReleased), not from whether the caller's
  // pre-loaded document said work was outstanding.
  //
  // The two racers here PARTITION the work: the per-item claim is atomic, so
  // one racer credits i1 and the other credits i2. Both therefore performed
  // real, non-overlapping work and both may legitimately report true. That is
  // categorically different from the D23C defect, where every racer believed it
  // owned the WHOLE job because the boolean came from a stale completion flag.
  // The invariant that actually matters is that the work is never duplicated.
  assert.ok(
    results.every(r => r.completed),
    'both callers can tell that the restoration requirement is satisfied',
  )
  assert.equal(
    results.reduce((sum, r) => sum + r.itemsRestored, 0),
    2,
    'each line item is credited exactly once across both callers, never twice',
  )
  assert.ok(
    results.every(r => r.performedByThisCall === (r.itemsRestored > 0 || r.couponReleased)),
    'performedByThisCall is only ever true when this call actually mutated something',
  )
  assert.equal(state.variants[0].stock, 12, 'item 1 restored exactly once despite two callers')
  assert.equal(state.variants[1].stock, 23, 'item 2 restored exactly once despite two callers')
  assert.equal(state.order.stockRestored, true)
})