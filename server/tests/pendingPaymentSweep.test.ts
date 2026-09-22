import { test } from 'node:test'
import assert from 'node:assert/strict'

import { pendingPaymentCutoff, sweepAbandonedPendingPayments, type PendingPaymentSweepDependencies } from '../src/services/orderLifecycle.service'

const now = new Date('2026-09-22T12:00:00.000Z')
const old = new Date('2026-09-22T11:00:00.000Z')
const recent = new Date('2026-09-22T11:45:00.000Z')

function fakeSweep(orders: any[], options: { raceIds?: string[]; restoredIds?: string[]; couponIds?: string[] } = {}) {
  const state = orders.map(order => ({ ...order }))
  const raceIds = new Set(options.raceIds || [])
  const restoredIds = new Set(options.restoredIds || [])
  const couponIds = new Set(options.couponIds || [])
  const dependencies: PendingPaymentSweepDependencies = {
    findCandidates: async filter => state.filter(order => order.status === filter.status && order.paymentStatus === filter.paymentStatus && order.createdAt < (filter.createdAt as any).$lt),
    claim: async candidate => {
      if (raceIds.has(candidate._id)) return null
      const order = state.find(item => item._id === candidate._id && item.status === 'PENDING' && item.paymentStatus === 'PENDING_PAYMENT')
      if (!order) return null
      order.status = 'CANCELLED'
      return order
    },
    restore: async order => {
      if (restoredIds.has(order._id)) return { restored: false, couponReleased: false }
      restoredIds.add(order._id)
      return { restored: true, couponReleased: couponIds.has(order._id) }
    },
  }
  return sweepAbandonedPendingPayments(now, dependencies)
}

const pending = (id: string, createdAt = old, couponId?: string) => ({ _id: id, status: 'PENDING', paymentStatus: 'PENDING_PAYMENT', createdAt, couponId })

test('recent pending order is untouched', async () => assert.deepEqual(await fakeSweep([pending('recent', recent)]), { scanned: 0, eligible: 0, cancelled: 0, stockRestored: 0, couponsReleased: 0, skippedRace: 0, errors: 0 }))
test('old pending order is eligible and cancelled', async () => assert.equal((await fakeSweep([pending('old')])).cancelled, 1))
test('paid order is untouched', async () => assert.equal((await fakeSweep([{ ...pending('paid'), paymentStatus: 'PAID' }])).scanned, 0))
test('cancelled order is untouched', async () => assert.equal((await fakeSweep([{ ...pending('cancelled'), status: 'CANCELLED' }])).scanned, 0))
test('already restored stock is not restored twice', async () => assert.equal((await fakeSweep([pending('restored')], { restoredIds: ['restored'] })).stockRestored, 0))
test('already released coupon is not released twice', async () => assert.equal((await fakeSweep([pending('coupon')], { restoredIds: ['coupon'], couponIds: ['coupon'] })).couponsReleased, 0))
test('payment race skips an order that no longer claims atomically', async () => assert.equal((await fakeSweep([pending('race')], { raceIds: ['race'] })).skippedRace, 1))
test('multiple order variants remain isolated per order claim', async () => assert.equal((await fakeSweep([pending('one'), pending('two')])).cancelled, 2))
test('multiple orders are processed independently when one races', async () => assert.deepEqual((await fakeSweep([pending('race'), pending('ok')], { raceIds: ['race'] })).cancelled, 1))
test('no eligible orders is a safe no-op', async () => assert.equal((await fakeSweep([])).errors, 0))
test('repeated sweep is idempotent after the first claim', async () => {
  const order = pending('repeat')
  let calls = 0
  const dependencies: PendingPaymentSweepDependencies = {
    findCandidates: async _filter => calls++ === 0 ? [order] : [],
    claim: async () => order,
    restore: async () => ({ restored: calls === 1, couponReleased: false }),
  }
  const first = await sweepAbandonedPendingPayments(now, dependencies)
  const second = await sweepAbandonedPendingPayments(now, dependencies)
  assert.equal(first.stockRestored, 1)
  assert.equal(second.stockRestored, 0)
})
test('malformed order errors are counted without stopping other work', async () => {
  const result = await fakeSweep([{ _id: 'bad', status: 'PENDING', paymentStatus: 'PENDING_PAYMENT', createdAt: old }, pending('good')], { raceIds: ['bad'] })
  assert.equal(result.cancelled, 1)
  assert.equal(result.skippedRace, 1)
})

test('cutoff uses the configured timeout window', () => {
  assert.equal(pendingPaymentCutoff(now, 30).toISOString(), '2026-09-22T11:30:00.000Z')
})