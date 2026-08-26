export const API_URL = import.meta.env.VITE_API_URL || '/api/v1'

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: 'badge-warning',
  CONFIRMED: 'badge-info',
  PROCESSING: 'badge-info',
  SHIPPED: 'badge-info',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
  RETURNED: 'badge-danger',
}

export const REPAIR_STATUS_COLORS: Record<string, string> = {
  BOOKING_RECEIVED: 'badge-info',
  IN_DIAGNOSIS: 'badge-warning',
  DIAGNOSED: 'badge-warning',
  IN_REPAIR: 'badge-warning',
  COMPLETED: 'badge-success',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-danger',
}

export const REQUEST_STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'badge-info',
  UNDER_REVIEW: 'badge-warning',
  APPROVED: 'badge-success',
  REJECTED: 'badge-danger',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
}
