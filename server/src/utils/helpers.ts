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

export function generateReturnNumber(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(100000 + Math.random() * 900000)
  return `OMR-${year}-${random}`
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
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

export function normalizePhone(phone: string): string | null {
  if (!phone) return null
  const digits = phone.replace(/\s|-|\(|\)/g, '')
  const hasCountryCode = digits.startsWith('+91')
  const bare = hasCountryCode ? digits.slice(3) : digits
  if (!/^[6-9]\d{9}$/.test(bare)) return null
  return `+91${bare}`
}

// Validates a 15-digit IMEI using the Luhn checksum (IMEI, TAC check digit).
export function isValidImei(imei: string): boolean {
  const digits = String(imei || '').replace(/\s+/g, '')
  if (!/^\d{15}$/.test(digits)) return false
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let n = parseInt(digits[i], 10)
    if (i % 2 === 1) {
      n *= 2
      if (n > 9) n = (n % 10) + Math.floor(n / 10)
    }
    sum += n
  }
  return sum % 10 === 0
}

export function normalizeImei(imei: string): string | null {
  const digits = String(imei || '').replace(/\s+/g, '')
  if (!isValidImei(digits)) return null
  return digits
}

export function paginate(page: number, limit: number) {
  const safeLimit = Math.min(Math.max(Number.isFinite(limit) ? Math.floor(limit) : 20, 1), 100)
  const safePage = Math.max(Number.isFinite(page) ? Math.floor(page) : 1, 1)
  return {
    skip: (safePage - 1) * safeLimit,
    limit: safeLimit,
    page: safePage,
  }
}
