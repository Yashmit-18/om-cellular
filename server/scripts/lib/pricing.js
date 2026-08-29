// Pricing helpers for OM Cellular seed scripts.
// Models realistic Indian resale base values so the valuation engine and
// phone catalog never ship with zero prices.

const BASE_BY_BRAND = {
  Apple: 30000,
  Samsung: 24000,
  Google: 26000,
  OnePlus: 24000,
  Xiaomi: 15000,
  Redmi: 11000,
  POCO: 12000,
  Realme: 13000,
  Vivo: 14000,
  OPPO: 15000,
  Motorola: 13000,
  Nothing: 19000,
  iQOO: 15000,
  Infinix: 9500,
  Tecno: 9000,
  Lava: 7500,
  Nokia: 6500,
  Honor: 12000,
  Asus: 20000,
}

const STORAGE_ADJ = { '64GB': 0, '128GB': 2500, '256GB': 5500, '512GB': 10000, '1TB': 16000 }

function roundDown(value) {
  return Math.max(0, Math.round(value / 100) * 100)
}

function storageAdjust(storage) {
  const key = String(storage || '')
    .replace(/\s+/g, '')
    .toUpperCase()
  return STORAGE_ADJ[key] || 0
}

function guessRam(baseValue) {
  if (baseValue >= 45000) return '12GB'
  if (baseValue >= 20000) return '8GB'
  return '6GB'
}

function computeModelBase(brand, modelName) {
  const low = String(modelName || '').toLowerCase()

  // Apple iPhone family
  if (brand === 'Apple') {
    const m = low.match(/iphone\s*(\d+)/)
    if (m) {
      const gen = parseInt(m[1], 10)
      let base = 16500 + (gen - 11) * 4500
      if (low.includes('pro max')) base += 15000
      else if (low.includes('pro')) base += 10000
      else if (low.includes('plus')) base += 1500
      else if (low.includes('mini')) base -= 1500
      return roundDown(base)
    }
    return roundDown(28000)
  }

  // Samsung Galaxy S + Fold/Flip + A series
  if (brand === 'Samsung') {
    const m = low.match(/galaxy\s*s(\d+)/)
    if (m) {
      const num = parseInt(m[1], 10)
      let base = 24000 + (num - 20) * 4500
      if (low.includes('ultra')) base += 12000
      else if (low.includes('plus')) base += 3000
      return roundDown(base)
    }
    if (low.includes('fold')) return roundDown(82000)
    if (low.includes('flip')) return roundDown(39000)
    const mSeries = low.match(/galaxy\s*(a|m|f)(\d+)/)
    if (mSeries) {
      const series = mSeries[1]
      const num = parseInt(mSeries[2], 10)
      let base = 5200
      if (series === 'a') base = 5000 + num * 220
      else if (series === 'm') base = 6000 + num * 200
      else if (series === 'f') base = 6500 + num * 150
      return roundDown(base)
    }
    return roundDown(12000)
  }

  // Generic brands
  let base = BASE_BY_BRAND[brand] || 12000
  if (low.includes('ultra')) base += 10000
  const proCount = (low.match(/pro/g) || []).length
  base += proCount * 4000
  if (low.includes('fold')) base += 18000
  if (low.includes('flip')) base += 4000
  if (low.includes('rog')) base += 12000
  if (low.includes('plus') || low.includes('+')) base += 1500
  if (low.includes('note')) base += 1200
  return roundDown(base)
}

function storageVariantBaseValue(brand, modelName, storage) {
  return computeModelBase(brand, modelName) + storageAdjust(storage)
}

module.exports = {
  computeModelBase,
  storageAdjust,
  guessRam,
  storageVariantBaseValue,
  BASE_BY_BRAND,
  STORAGE_ADJ,
  roundDown,
}