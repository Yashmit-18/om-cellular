import { test } from 'node:test'
import assert from 'node:assert/strict'

import { canTransition, RETURN_REQUEST_TRANSITIONS, POST_DELIVERY_STATES, SELL_TRANSITIONS } from '../src/services/fsm.service'
import { generateReturnNumber } from '../src/utils/helpers'
import { INVENTORY_MOVEMENT_TYPES } from '../src/models/inventoryLedger.model'

test('return request transitions allow the happy path to refund', () => {
  const path = ['RETURN_REQUESTED', 'ADMIN_REVIEW', 'RETURN_APPROVED', 'RETURN_RECEIVED', 'REFUND_PENDING', 'REFUNDED']
  for (let i = 0; i < path.length - 1; i++) {
    assert.ok(canTransition(path[i], path[i + 1], RETURN_REQUEST_TRANSITIONS), `${path[i]} -> ${path[i + 1]}`)
  }
})

test('return request transitions reject illegal jumps', () => {
  assert.ok(!canTransition('RETURN_REQUESTED', 'REFUNDED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(!canTransition('RETURN_REQUESTED', 'RETURN_RECEIVED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(!canTransition('RETURN_REJECTED', 'RETURN_APPROVED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(!canTransition('REFUNDED', 'RETURN_REQUESTED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(!canTransition('CANCELLED', 'RETURN_RECEIVED', RETURN_REQUEST_TRANSITIONS))
})

test('return request transitions support rejection and cancellation exits', () => {
  assert.ok(canTransition('ADMIN_REVIEW', 'RETURN_REJECTED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(canTransition('RETURN_APPROVED', 'CANCELLED', RETURN_REQUEST_TRANSITIONS))
  assert.ok(canTransition('RETURN_RECEIVED', 'REFUNDED', RETURN_REQUEST_TRANSITIONS))
})

test('every return terminal status has no outgoing edge', () => {
  for (const terminal of ['REFUNDED', 'CANCELLED']) {
    assert.deepEqual(RETURN_REQUEST_TRANSITIONS[terminal], [])
  }
})

test('post-delivery states include return lifecycle states', () => {
  for (const s of ['DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUND_PENDING', 'REFUNDED', 'RETURNED']) {
    assert.ok(POST_DELIVERY_STATES.includes(s))
  }
})

test('sell flow can reach a payout via offer acceptance', () => {
  const path = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'INSPECTED', 'OFFER_MADE', 'OFFER_ACCEPTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED']
  for (let i = 0; i < path.length - 1; i++) {
    assert.ok(canTransition(path[i], path[i + 1], SELL_TRANSITIONS), `${path[i]} -> ${path[i + 1]}`)
  }
})

test('return numbers use the OMR-yyyy-###### pattern', () => {
  for (let i = 0; i < 5; i++) {
    const n = generateReturnNumber()
    assert.match(n, /^OMR-\d{4}-\d{6}$/)
  }
})

test('inventory movement reasons cover the write path sources', () => {
  for (const reason of ['ORDER_PLACED', 'ORDER_CANCELLED', 'MANUAL_ADJUSTMENT', 'RETURN_RECEIVED', 'INITIAL_STOCK']) {
    assert.ok(INVENTORY_MOVEMENT_TYPES.includes(reason as any))
  }
})