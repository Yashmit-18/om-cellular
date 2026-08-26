import { type ClassValue, clsx } from 'clsx'

export function cn(...classes: (string | undefined | false | null)[]) {
  return clsx(classes)
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPriceCompact(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

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

export function generateRequestNumber(
  type: 'sell' | 'exchange'
): string {
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

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getStockStatus(
  stock: number
): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (stock <= 0) return 'out_of_stock'
  if (stock <= 5) return 'low_stock'
  return 'in_stock'
}

export function calculateDiscount(
  price: number,
  discountPrice: number
): number {
  if (price <= 0 || discountPrice >= price) return 0
  return Math.round(((price - discountPrice) / price) * 100)
}

export function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    NEW: 'Brand New',
    LIKE_NEW: 'Like New',
    EXCELLENT: 'Excellent',
    GOOD: 'Good',
    FAIR: 'Fair',
  }
  return labels[condition] || condition
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '…'
}
