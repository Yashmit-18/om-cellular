export function generateOrderNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  return `OMC-${year}-${random}`
}

export function generateRepairBookingNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  return `OMR-${year}-${random}`
}

export function generateRequestNumber(type: 'sell' | 'exchange'): string {
  const year = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  const prefix = type === 'sell' ? 'OMS' : 'OMX'
  return `${prefix}-${year}-${random}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function paginate(page: number, limit: number) {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const safePage = Math.max(page, 1)
  return {
    skip: (safePage - 1) * safeLimit,
    limit: safeLimit,
    page: safePage,
  }
}
