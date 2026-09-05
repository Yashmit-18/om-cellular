export const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending Confirmation',
  PAYMENT_CONFIRMED: 'Payment Confirmed',
  CONFIRMED: 'Order Confirmed',
  PROCESSING: 'Processing',
  READY_TO_SHIP: 'Ready to Ship',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  CANCEL_REQUESTED: 'Cancellation Requested',
  FAILED: 'Failed',
  RETURN_REQUESTED: 'Return Requested',
  RETURN_APPROVED: 'Return Approved',
  RETURNED: 'Returned',
  REFUND_PENDING: 'Refund Pending',
  REFUNDED: 'Refunded',
}

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-warning',
  PAYMENT_CONFIRMED: 'badge-success',
  CONFIRMED: 'badge-info',
  PROCESSING: 'badge-info',
  READY_TO_SHIP: 'badge-info',
  SHIPPED: 'badge-info',
  OUT_FOR_DELIVERY: 'badge-warning',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
  CANCEL_REQUESTED: 'badge-warning',
  FAILED: 'badge-danger',
  RETURN_REQUESTED: 'badge-warning',
  RETURN_APPROVED: 'badge-info',
  RETURNED: 'badge-danger',
  REFUND_PENDING: 'badge-warning',
  REFUNDED: 'badge-info',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-warning',
  PENDING_PAYMENT: 'badge-warning',
  PAID: 'badge-success',
  FAILED: 'badge-danger',
  REFUNDED: 'badge-info',
}

export const REPAIR_STATUS_LABELS: Record<string, string> = {
  BOOKING_RECEIVED: 'Booking Received',
  APPROVED: 'Approved',
  IN_DIAGNOSIS: 'In Diagnosis',
  DIAGNOSED: 'Diagnosed',
  REJECTED: 'Rejected',
  IN_REPAIR: 'In Repair',
  AWAITING_PARTS: 'Awaiting Parts',
  COMPLETED: 'Repair Completed',
  READY_FOR_PICKUP: 'Ready for Pickup',
  OUT_FOR_DELIVERY: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

export const REPAIR_STATUS_COLORS: Record<string, string> = {
  BOOKING_RECEIVED: 'badge-info',
  APPROVED: 'badge-success',
  IN_DIAGNOSIS: 'badge-warning',
  DIAGNOSED: 'badge-warning',
  REJECTED: 'badge-danger',
  IN_REPAIR: 'badge-warning',
  AWAITING_PARTS: 'badge-warning',
  COMPLETED: 'badge-success',
  READY_FOR_PICKUP: 'badge-info',
  OUT_FOR_DELIVERY: 'badge-warning',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
}

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  SUBMITTED: 'Submitted',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  INSPECTED: 'Inspected',
  OFFER_MADE: 'Offer Made',
  OFFER_ACCEPTED: 'Offer Accepted',
  OFFER_DECLINED: 'Offer Declined',
  REJECTED: 'Rejected',
  PICKUP_SCHEDULED: 'Pickup Scheduled',
  PICKED_UP: 'Device Picked Up',
  PAYMENT_PENDING: 'Payment Pending',
  PAYMENT_COMPLETED: 'Payment Completed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'badge-info',
  UNDER_REVIEW: 'badge-warning',
  APPROVED: 'badge-success',
  INSPECTED: 'badge-info',
  OFFER_MADE: 'badge-info',
  OFFER_ACCEPTED: 'badge-success',
  OFFER_DECLINED: 'badge-danger',
  REJECTED: 'badge-danger',
  PICKUP_SCHEDULED: 'badge-warning',
  PICKED_UP: 'badge-info',
  PAYMENT_PENDING: 'badge-warning',
  PAYMENT_COMPLETED: 'badge-success',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
}

export const SERVICE_LABELS: Record<string, string> = {
  delivery: 'Delivery',
  repair: 'Doorstep Pickup / Repair',
  pickupDrop: 'Pickup & Drop',
  sell: 'Sell Your Phone',
  exchange: 'Exchange',
}

export const SERVICE_REQUEST_STATUS_LABELS: Record<string, string> = {
  WAITING: 'Waiting',
  NOTIFIED: 'Notified',
  CLOSED: 'Closed',
}

export const SERVICE_REQUEST_STATUS_COLORS: Record<string, string> = {
  WAITING: 'badge-warning',
  NOTIFIED: 'badge-success',
  CLOSED: 'badge-info',
}