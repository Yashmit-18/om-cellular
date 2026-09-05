import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ORDER_TRANSITIONS, REPAIR_TRANSITIONS, SELL_TRANSITIONS, EXCHANGE_TRANSITIONS, assertTransition, canTransition, PRE_CANCEL_STATES } from '../src/services/fsm.service'

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