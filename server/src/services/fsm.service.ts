// Centralized status transition maps (finite state machines) for the order,
// repair, sell and exchange lifecycle. Every status update goes through
// assertTransition so invalid jumps return a 4xx instead of corrupting state.

export type TransitionMap = Record<string, string[]>

export function canTransition(current: string, next: string, map: TransitionMap): boolean {
  if (current === next) return true
  const allowed = map[current]
  return Array.isArray(allowed) && allowed.includes(next)
}

export function assertTransition(current: string, next: string, map: TransitionMap, label: string): void {
  if (!canTransition(current, next, map)) {
    const error = new Error(`Invalid ${label} status transition: ${current} -> ${next}`)
    ;(error as any).statusCode = 400
    throw error
  }
}

export const ORDER_TRANSITIONS: TransitionMap = {
  PENDING: ['PAYMENT_CONFIRMED', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'FAILED'],
  PAYMENT_CONFIRMED: ['CONFIRMED', 'PROCESSING', 'CANCEL_REQUESTED', 'CANCELLED', 'FAILED'],
  CONFIRMED: ['PROCESSING', 'READY_TO_SHIP', 'CANCEL_REQUESTED', 'CANCELLED', 'FAILED'],
  PROCESSING: ['READY_TO_SHIP', 'CANCEL_REQUESTED', 'CANCELLED'],
  READY_TO_SHIP: ['SHIPPED', 'CANCEL_REQUESTED', 'CANCELLED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'RETURN_REQUESTED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'RETURN_REQUESTED'],
  DELIVERED: ['RETURN_REQUESTED', 'RETURNED'],
  CANCEL_REQUESTED: ['CANCELLED', 'PENDING', 'PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP'],
  RETURN_REQUESTED: ['RETURN_APPROVED', 'RETURNED', 'DELIVERED'],
  RETURN_APPROVED: ['REFUND_PENDING', 'REFUNDED', 'RETURNED'],
  REFUND_PENDING: ['REFUNDED', 'RETURNED'],
  CANCELLED: [],
  RETURNED: [],
  REFUNDED: [],
  FAILED: [],
}

// Rejecting a customer cancel/return request moves the order back to the
// active state it was in before the request.
export const PRE_CANCEL_STATES = ['PENDING', 'PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'READY_TO_SHIP']
export const POST_DELIVERY_STATES = ['DELIVERED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'REFUND_PENDING', 'REFUNDED', 'RETURNED']

export const REPAIR_TRANSITIONS: TransitionMap = {
  BOOKING_RECEIVED: ['APPROVED', 'REJECTED', 'IN_DIAGNOSIS', 'CANCELLED'],
  APPROVED: ['IN_DIAGNOSIS', 'IN_REPAIR', 'CANCELLED'],
  IN_DIAGNOSIS: ['DIAGNOSED', 'CANCELLED'],
  DIAGNOSED: ['APPROVED', 'IN_REPAIR', 'AWAITING_PARTS', 'REJECTED', 'CANCELLED', 'COMPLETED'],
  IN_REPAIR: ['COMPLETED', 'AWAITING_PARTS', 'CANCELLED'],
  AWAITING_PARTS: ['IN_REPAIR', 'CANCELLED'],
  COMPLETED: ['READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  READY_FOR_PICKUP: ['DELIVERED', 'OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  REJECTED: [],
  DELIVERED: [],
  CANCELLED: [],
}

export const SELL_TRANSITIONS: TransitionMap = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'INSPECTED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['INSPECTED', 'OFFER_MADE', 'CANCELLED'],
  INSPECTED: ['OFFER_MADE', 'REJECTED'],
  OFFER_MADE: ['OFFER_ACCEPTED', 'OFFER_DECLINED', 'CANCELLED'],
  OFFER_ACCEPTED: ['PICKUP_SCHEDULED', 'PAYMENT_PENDING'],
  OFFER_DECLINED: ['CANCELLED'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['PAYMENT_COMPLETED', 'CANCELLED'],
  PAYMENT_COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}

export const EXCHANGE_TRANSITIONS: TransitionMap = {
  SUBMITTED: ['UNDER_REVIEW', 'REJECTED', 'CANCELLED'],
  UNDER_REVIEW: ['APPROVED', 'INSPECTED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['INSPECTED', 'OFFER_MADE', 'CANCELLED'],
  INSPECTED: ['OFFER_MADE', 'REJECTED'],
  OFFER_MADE: ['OFFER_ACCEPTED', 'OFFER_DECLINED', 'CANCELLED'],
  OFFER_ACCEPTED: ['PICKUP_SCHEDULED', 'PAYMENT_PENDING', 'COMPLETED'],
  OFFER_DECLINED: ['CANCELLED'],
  PICKUP_SCHEDULED: ['PICKED_UP', 'CANCELLED'],
  PICKED_UP: ['COMPLETED', 'PAYMENT_PENDING'],
  PAYMENT_PENDING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
}