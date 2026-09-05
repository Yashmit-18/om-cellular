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

export function formatRelative(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return formatDate(date)
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

function parseImages(value: unknown): string[] {
  if (!value) return []
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter(Boolean) : value ? [value] : []
    } catch {
      return value ? [value] : []
    }
  }
  if (Array.isArray(value)) return value.filter(Boolean)
  return []
}

export function pickImage(product: { images?: unknown; primaryImage?: string }, variantImages?: unknown): string {
  const productImgs = parseImages(product?.images)
  if (productImgs.length > 0) return productImgs[0]
  const variantImgs = parseImages(variantImages)
  if (variantImgs.length > 0) return variantImgs[0]
  if (product?.primaryImage) return product.primaryImage
  return ''
}

export function getImageList(productImages: unknown, variantImages?: unknown): string[] {
  const productImgs = parseImages(productImages)
  const variantImgs = parseImages(variantImages)
  return [...productImgs, ...variantImgs].filter(Boolean)
}

export function isValidImageUrl(url: string): boolean {
  return typeof url === 'string' && /^https?:\/\/.+/.test(url)
}

export function storeAddressText(): string {
  return 'Shop No. 8, Upper Ground Floor, Center Square Mall, Gumanpura Road, Kota, Rajasthan 324007, India'
}

export function googleMapsSearchUrl(): string {
  const q = encodeURIComponent('Shop No. 8, Upper Ground Floor, Center Square Mall, Gumanpura Road, Kota, Rajasthan 324007, India')
  return `https://www.google.com/maps/search/?api=1&query=${q}`
}

export function googleMapsEmbedUrl(): string {
  const q = encodeURIComponent('Shop No. 8 Upper Ground Floor Center Square Mall Gumanpura Road Kota Rajasthan 324007 India')
  return `https://maps.google.com/maps?q=${q}&z=16&output=embed`
}
