import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ORDER_TRANSITIONS, REPAIR_TRANSITIONS, SELL_TRANSITIONS, EXCHANGE_TRANSITIONS, RETURN_REQUEST_TRANSITIONS, assertTransition, canTransition, PRE_CANCEL_STATES } from '../src/services/fsm.service'

test('assertTransition allows legal order transitions', () => {
  assert.doesNotThrow(() => assertTransition('PENDING', 'CONFIRMED', ORDER_TRANSITIONS, 'order'))
  assert.doesNotThrow(() => assertTransition('CONFIRMED', 'PROCESSING', ORDER_TRANSITIONS, 'order'))
  assert.doesNotThrow(() => assertTransition('SHIPPED', 'OUT_FOR_DELIVERY', ORDER_TRANSITIONS, 'order'))
  assert.doesNotThrow(() => assertTransition('OUT_FOR_DELIVERY', 'DELIVERED', ORDER_TRANSITIONS, 'order'))
})

test('assertTransition rejects illegal order transitions', () => {
  assert.throws(
    () => assertTransition('DELIVERED', 'PROCESSING', ORDER_TRANSITIONS, 'order'),
    (err: any) => err?.statusCode === 400 && /invalid order status transition/i.test(String(err.message))
  )
  assert.throws(
    () => assertTransition('PENDING', 'OUT_FOR_DELIVERY', ORDER_TRANSITIONS, 'order'),
    (err: any) => err?.statusCode === 400
  )
})

test('order cancellation is only allowed before the order ships', () => {
  assert.ok(canTransition('READY_TO_SHIP', 'CANCELLED', ORDER_TRANSITIONS))
  assert.ok(!canTransition('SHIPPED', 'CANCELLED', ORDER_TRANSITIONS))
  assert.ok(!canTransition('DELIVERED', 'CANCELLED', ORDER_TRANSITIONS))
  assert.ok(PRE_CANCEL_STATES.includes('CONFIRMED'))
  assert.ok(!PRE_CANCEL_STATES.includes('DELIVERED'))
})

test('repair / sell / exchange transitions exist and are directional', () => {
  assert.ok(canTransition('BOOKING_RECEIVED', 'APPROVED', REPAIR_TRANSITIONS))
  assert.ok(!canTransition('COMPLETED', 'APPROVED', REPAIR_TRANSITIONS))
  assert.ok(canTransition('SUBMITTED', 'UNDER_REVIEW', SELL_TRANSITIONS))
  assert.ok(canTransition('INSPECTED', 'OFFER_MADE', SELL_TRANSITIONS))
  assert.ok(canTransition('OFFER_MADE', 'OFFER_ACCEPTED', EXCHANGE_TRANSITIONS))
  assert.ok(canTransition('OFFER_MADE', 'OFFER_DECLINED', EXCHANGE_TRANSITIONS))
  assert.ok(canTransition('OFFER_ACCEPTED', 'COMPLETED', EXCHANGE_TRANSITIONS))
  assert.ok(!canTransition('OFFER_ACCEPTED', 'OFFER_DECLINED', EXCHANGE_TRANSITIONS))
  assert.ok(!canTransition('OFFER_MADE', 'SUBMITTED', EXCHANGE_TRANSITIONS))
})

test('unknown from-status is not transitionable', () => {
  assert.ok(!canTransition('BOGUS', 'CONFIRMED', ORDER_TRANSITIONS))
})

test('a sell request can fully progress to a payout and then stops', () => {
  const path: [string, string][] = [
    ['SUBMITTED', 'UNDER_REVIEW'],
    ['UNDER_REVIEW', 'INSPECTED'],
    ['INSPECTED', 'OFFER_MADE'],
    ['OFFER_MADE', 'OFFER_ACCEPTED'],
    ['OFFER_ACCEPTED', 'PICKUP_SCHEDULED'],
    ['PICKUP_SCHEDULED', 'PICKED_UP'],
    ['PICKED_UP', 'PAYMENT_PENDING'],
    ['PAYMENT_PENDING', 'PAYMENT_COMPLETED'],
  ]
  for (const [from, to] of path) assert.ok(canTransition(from, to, SELL_TRANSITIONS), `${from} -> ${to}`)
  assert.deepEqual(SELL_TRANSITIONS.PAYMENT_COMPLETED, [])
  assert.ok(!canTransition('PAYMENT_COMPLETED', 'PAYMENT_PENDING', SELL_TRANSITIONS))
})

test('exchange can complete directly from an accepted offer or after pickup', () => {
  assert.ok(canTransition('OFFER_ACCEPTED', 'COMPLETED', EXCHANGE_TRANSITIONS))
  assert.ok(canTransition('PICKED_UP', 'COMPLETED', EXCHANGE_TRANSITIONS))
  assert.ok(canTransition('PAYMENT_PENDING', 'COMPLETED', EXCHANGE_TRANSITIONS))
  const path: [string, string][] = [
    ['SUBMITTED', 'UNDER_REVIEW'],
    ['UNDER_REVIEW', 'APPROVED'],
    ['APPROVED', 'INSPECTED'],
    ['INSPECTED', 'OFFER_MADE'],
    ['OFFER_MADE', 'OFFER_ACCEPTED'],
    ['OFFER_ACCEPTED', 'PICKUP_SCHEDULED'],
    ['PICKUP_SCHEDULED', 'PICKED_UP'],
    ['PICKED_UP', 'COMPLETED'],
  ]
  for (const [from, to] of path) assert.ok(canTransition(from, to, EXCHANGE_TRANSITIONS), `${from} -> ${to}`)
  assert.deepEqual(EXCHANGE_TRANSITIONS.COMPLETED, [])
})

test('sell offer declines are terminal unless the customer requests cancellation', () => {
  assert.ok(canTransition('OFFER_DECLINED', 'CANCELLED', SELL_TRANSITIONS))
  assert.ok(!canTransition('OFFER_DECLINED', 'OFFER_MADE', SELL_TRANSITIONS))
  assert.ok(!canTransition('REJECTED', 'SUBMITTED', SELL_TRANSITIONS))
})

test('return flow reaches REFUNDED only through a refund-pending step', () => {
  const path: [string, string][] = [
    ['RETURN_REQUESTED', 'ADMIN_REVIEW'],
    ['ADMIN_REVIEW', 'RETURN_APPROVED'],
    ['RETURN_APPROVED', 'RETURN_RECEIVED'],
    ['RETURN_RECEIVED', 'REFUND_PENDING'],
    ['REFUND_PENDING', 'REFUNDED'],
  ]
  for (const [from, to] of path) assert.ok(canTransition(from, to, RETURN_REQUEST_TRANSITIONS), `${from} -> ${to}`)
  assert.ok(!canTransition('RETURN_REQUESTED', 'REFUNDED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(!canTransition('ADMIN_REVIEW', 'REFUND_PENDING', RETURN_REQUEST_TRANSITIONS))
  assert.deepEqual(RETURN_REQUEST_TRANSITIONS.REFUNDED, [])
})

test('every listed state maps to an existing (or terminal) target list', () => {
  for (const map of [ORDER_TRANSITIONS, EXCHANGE_TRANSITIONS, SELL_TRANSITIONS, REPAIR_TRANSITIONS, RETURN_REQUEST_TRANSITIONS]) {
    for (const [from, next] of Object.entries(map)) {
      for (const n of next) {
        assert.ok(map[n] !== undefined, `target state ${n} (from ${from}) has no definition`)
      }
    }
  }
})