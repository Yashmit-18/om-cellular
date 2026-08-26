import { clsx, type ClassValue } from 'clsx'

export function cn(...classes: ClassValue[]) {
  return clsx(classes)
}

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trimEnd() + '\u2026'
}

export function getStockStatus(stock: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (stock <= 0) return 'out_of_stock'
  if (stock <= 5) return 'low_stock'
  return 'in_stock'
}

export function calculateDiscount(price: number, discountPrice: number): number {
  if (price <= 0 || discountPrice >= price) return 0
  return Math.round(((price - discountPrice) / price) * 100)
}

export function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    NEW: 'Brand New', LIKE_NEW: 'Like New', EXCELLENT: 'Excellent', GOOD: 'Good', FAIR: 'Fair',
  }
  return labels[condition] || condition
}
