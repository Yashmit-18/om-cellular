// Retail pricing helpers for OM Cellular premium phone catalog.
// Produces realistic Indian-market selling prices + reference (MRP) prices
// per brand/model/storage, plus discount guidance.
//
// The source of truth is a hand-maintained map of current selling prices for
// the most commonly stocked storage of each model. Larger storage is priced
// via additive deltas scaled per brand. Models not in the map fall back to a
// deterministic formula derived from the resale pricing engine.

const round100 = (n) => Math.max(0, Math.round(n / 100) * 100)

const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()

// Selling price (INR) for the reference storage of each model.
const SELLING = {
  apple: {
    'iphone 11': 28999, 'iphone 11 pro': 46999, 'iphone 11 pro max': 52999,
    'iphone 12': 38999, 'iphone 12 mini': 42999, 'iphone 12 pro': 64999, 'iphone 12 pro max': 69999,
    'iphone 13': 54900, 'iphone 13 mini': 48900, 'iphone 13 pro': 94900, 'iphone 13 pro max': 104900,
    'iphone 14': 64900, 'iphone 14 plus': 74900, 'iphone 14 pro': 104900, 'iphone 14 pro max': 114900,
    'iphone 15': 69900, 'iphone 15 plus': 79900, 'iphone 15 pro': 124900, 'iphone 15 pro max': 144900,
    'iphone 16': 79900, 'iphone 16 plus': 89900, 'iphone 16 pro': 119900, 'iphone 16 pro max': 144900,
  },
  samsung: {
    'galaxy s24 ultra': 109900, 'galaxy s24+': 74999, 'galaxy s24': 64999,
    'galaxy s23 ultra': 82999, 'galaxy s23+': 69999, 'galaxy s23': 59999,
    'galaxy s22 ultra': 79999, 'galaxy s22+': 59999, 'galaxy s22': 44999,
    'galaxy a55': 35999, 'galaxy a54': 28999, 'galaxy a35': 27999, 'galaxy a34': 26999,
    'galaxy a25': 19999, 'galaxy a15': 13999,
    'galaxy m55': 27999, 'galaxy m35': 16999, 'galaxy m15': 12999,
    'galaxy f55': 27999, 'galaxy f35': 17999, 'galaxy f15': 12999,
    'galaxy z fold6': 134999, 'galaxy z flip6': 89999, 'galaxy z fold5': 124999, 'galaxy z flip5': 69999,
  },
  oneplus: {
    'oneplus 13': 69999, 'oneplus 12': 64999, 'oneplus 12r': 39999,
    'oneplus 11': 51999, 'oneplus 11r': 39999,
    'oneplus nord 4': 32999, 'oneplus nord ce4': 24999, 'oneplus nord ce4 lite': 19999,
    'oneplus nord 3': 27999, 'oneplus nord ce3': 24999, 'oneplus nord ce3 lite': 17999,
    'oneplus nord 2t': 24999, 'oneplus 10 pro': 49999, 'oneplus 10t': 44999,
  },
  xiaomi: {
    'xiaomi 14': 59999, 'xiaomi 14 ultra': 99999, 'xiaomi 13': 54999, 'xiaomi 13t pro': 48999, 'xiaomi 13t': 39999,
    'xiaomi 12': 38999, 'xiaomi 11t pro': 33999,
  },
  redmi: {
    'redmi note 13 pro+ 5g': 27999, 'redmi note 13 pro 5g': 20999, 'redmi note 13 5g': 16999, 'redmi note 13': 15999,
    'redmi 13c': 9499, 'redmi 13': 11999, 'redmi a3': 8999,
    'redmi 12': 9999, 'redmi 12c': 8999, 'redmi 11 prime': 9499, 'redmi 10 power': 8999, 'redmi 13c 5g': 10999,
  },
  poco: {
    'poco x6 pro': 25999, 'poco x6': 21999, 'poco x6 neo': 15999, 'poco m6 pro': 15999,
    'poco m6': 10999, 'poco m6 5g': 11999, 'poco c65': 8999, 'poco f6': 29999, 'poco f6 pro': 34999,
    'poco x5 pro': 19999, 'poco m5': 11999, 'poco c55': 8499,
  },
  realme: {
    'realme gt 6 pro': 37999, 'realme gt 6': 32999, 'realme gt 5 pro': 39999, 'realme gt 5': 32999,
    'realme 13 pro+': 30999, 'realme 13 pro': 25999, 'realme 13 5g': 21999,
    'realme 12 pro+': 27999, 'realme 12 pro': 24999, 'realme 12 5g': 19999,
    'realme narzo 70x 5g': 12999, 'realme narzo 70 pro 5g': 19999,
    'realme c67': 12999, 'realme c65': 8999, 'realme c53': 8999, 'realme c51': 8499,
  },
  vivo: {
    'vivo x200 pro': 74999, 'vivo x200': 59999, 'vivo x100 pro': 69999, 'vivo x100': 53999,
    'vivo v40': 34999, 'vivo v40 lite': 25999, 'vivo v30 pro': 42999, 'vivo v30': 33999, 'vivo v30 lite': 24999,
    'vivo y28': 17999, 'vivo y27': 14999, 'vivo y18': 10999, 'vivo t3': 19999, 'vivo t3x': 13999, 'vivo t2x': 12999,
  },
  oppo: {
    'oppo find x8 pro': 69999, 'oppo find x8': 59999, 'oppo find x7 ultra': 69999,
    'oppo reno 12 pro': 36999, 'oppo reno 12': 29999, 'oppo reno 11f': 22999, 'oppo reno 11': 26999,
    'oppo a3 pro': 23999, 'oppo a3': 19999, 'oppo a3x': 10999, 'oppo a78': 19999, 'oppo a58': 16999,
    'oppo f27 pro+': 25999,
  },
  motorola: {
    'moto edge 50 pro': 31999, 'moto edge 50 ultra': 52999, 'moto edge 50 fusion': 24999,
    'moto edge 40 pro': 34999, 'moto edge 40': 25999,
    'moto g84': 18999, 'moto g74': 16999, 'moto g64': 14999, 'moto g54': 13999, 'moto g34': 12999,
    'moto g24': 9999, 'moto g14': 9499,
    'razr 50 ultra': 99999, 'razr 50': 64999, 'razr 40 ultra': 64999,
  },
  nothing: {
    'nothing phone 2a plus': 27999, 'nothing phone 2a': 23999, 'nothing phone 2': 44999,
    'nothing phone 1': 37999, 'cmf phone 1': 15999,
  },
  google: {
    'pixel 9 pro xl': 124999, 'pixel 9 pro': 109999, 'pixel 9': 79999, 'pixel 8a': 52999,
    'pixel 8 pro': 94999, 'pixel 8': 67999, 'pixel 7a': 43999, 'pixel 7 pro': 69999, 'pixel 7': 49999,
  },
  iqoo: {
    'iqoo 13': 49999, 'iqoo 12': 52999, 'iqoo 12 pro': 59999, 'iqoo neo 9 pro': 35999,
    'iqoo neo 9': 32999, 'iqoo z9x': 14999, 'iqoo z9': 19999, 'iqoo z7s': 16999,
  },
  infinix: {
    'infinix gt 20 pro': 24999, 'infinix note 40 pro': 21999, 'infinix note 40': 17999,
    'infinix hot 40 pro': 13999, 'infinix hot 40i': 10999, 'infinix hot 30i': 8999,
  },
  tecno: {
    'tecno camon 30 pro': 24999, 'tecno camon 30': 21999, 'tecno camon 20 pro': 17999,
    'tecno spark 20 pro+': 14999, 'tecno spark 20 pro': 13999, 'tecno spark 20': 10999,
    'tecno pova 5 pro': 14999, 'tecno pova 5': 11999,
  },
  lava: {
    'lava blaze curve': 17999, 'lava blaze pro 5g': 11999, 'lava blaze 2 5g': 12999,
    'lava blaze 1x': 9999, 'lava agni 2': 18999, 'lava agni 3': 22999,
  },
  nokia: {
    'nokia g42': 12999, 'nokia g22': 9999, 'nokia c32': 9499, 'nokia c22': 7499, 'nokia 105 4g': 1499,
  },
  honor: {
    'honor 200 pro': 39999, 'honor 200': 32999, 'honor magic6 pro': 74999, 'honor magic6': 59999,
    'honor x8b': 19999, 'honor x7b': 14999,
  },
  asus: {
    'rog phone 8 pro': 79999, 'rog phone 8': 79999, 'rog phone 7': 79999, 'rog phone 7 ultimate': 96999,
    'zenfone 11 ultra': 69999, 'zenfone 10': 59999, 'zenfone 9': 54999,
  },
}

// Xiaomi-brand entries that are actually Redmi devices (shared price source).
const REDMI_FAMILY = SELLING.redmi

// Storage add-ons (INR) scaled by brand for larger capacity.
const STORAGE_EXTRA = { '64gb': 0, '128gb': 0, '256gb': 4500, '512gb': 9500, '1tb': 16500 }

const BRAND_STORAGE_FACTOR = {
  apple: 1.55, samsung: 1.3, google: 1.3, oneplus: 1.15, vivo: 1.05, oppo: 1.05, asus: 1.2,
}

const BRAND_MRP_PAD = {
  apple: 1.12, samsung: 1.14, oneplus: 1.12, google: 1.06, nothing: 1.05, xiaomi: 1.1, redmi: 1.1,
  poco: 1.1, realme: 1.12, vivo: 1.12, oppo: 1.12, motorola: 1.14, iqoo: 1.1, infinix: 1.12,
  tecno: 1.12, lava: 1.12, nokia: 1.12, honor: 1.12, asus: 1.14,
}

const RETAIL_RATIO_FALLBACK = {
  apple: 2.6, samsung: 2.5, google: 2.4, oneplus: 2.5, xiaomi: 2.6, redmi: 2.7, poco: 2.7,
  realme: 2.7, vivo: 2.7, oppo: 2.7, motorola: 2.8, nothing: 2.4, iqoo: 2.7, infinix: 2.7,
  tecno: 2.7, lava: 2.8, nokia: 2.6, honor: 2.8, asus: 2.6,
}

function brandKey(brand) {
  return norm(brand).replace(/\s+/g, '')
}

function sellingForModel(brand, model) {
  const bk = brandKey(brand)
  const mk = norm(model)
  if (SELLING[bk] && SELLING[bk][mk] != null) return SELLING[bk][mk]
  if ((bk === 'xiaomi' || bk === 'redmi') && REDMI_FAMILY[mk] != null) return REDMI_FAMILY[mk]
  return null
}

// Pick the reference storage (the one SELLING.price refers to).
function referenceStorage(storageVariants) {
  if (!Array.isArray(storageVariants) || storageVariants.length === 0) return '128GB'
  const list = storageVariants.map(v => (typeof v === 'string' ? v : v.storage))
  if (list.some(s => norm(s) === '128gb')) return '128GB'
  return list[0]
}

function storageKey(storage) {
  return norm(String(storage)).replace(/\s+/g, '')
}

// Selling price (INR) for a given storage variant. Falls back to formula.
function sellingPrice(brand, model, storage, storageVariants) {
  const base = sellingForModel(brand, model)
  const ref = referenceStorage(storageVariants)
  const factor = BRAND_STORAGE_FACTOR[brandKey(brand)] || 1
  const extra = (STORAGE_EXTRA[storageKey(storage)] || 0) - (STORAGE_EXTRA[storageKey(ref)] || 0)
  if (base != null) return round100(base + Math.round(extra * factor))
  const { computeModelBase } = require('./pricing')
  const resale = computeModelBase(brand, model)
  const ratio = RETAIL_RATIO_FALLBACK[brandKey(brand)] || 2.6
  return round100(resale * ratio + extra * factor)
}

// Base used / refurbished selling price as a fraction of the original new
// retail selling price, per brand. Higher-end brands hold value a little
// better but premium devices still drop fastest in the pre-owned market.
const BRAND_USED_RATIO = {
  apple: 0.5, samsung: 0.5, google: 0.55, oneplus: 0.53, xiaomi: 0.6, redmi: 0.67,
  poco: 0.64, realme: 0.65, vivo: 0.62, oppo: 0.64, motorola: 0.64, nothing: 0.58,
  iqoo: 0.6, infinix: 0.68, tecno: 0.7, lava: 0.72, nokia: 0.72, honor: 0.66, asus: 0.58,
}

// Price-tier graduation applied on top of the brand ratio so entry-level phones
// (which barely lose value used) don't get discounted as hard as flagships.
function usedPriceRatio(brand, newSelling) {
  const base = BRAND_USED_RATIO[brandKey(brand)] || 0.65
  let tier = 0
  if (newSelling >= 80000) tier = -0.12
  else if (newSelling >= 50000) tier = -0.08
  else if (newSelling >= 25000) tier = -0.03
  else if (newSelling < 10000) tier = 0.06
  return base + tier
}

// Realistic pre-owned / refurbished selling price for a given model+storage.
function usedSellingPrice(brand, model, storage, storageVariants) {
  const newPrice = sellingPrice(brand, model, storage, storageVariants)
  return round100(newPrice * usedPriceRatio(brand, newPrice))
}

// Reference (MRP / launch-style new price) plus the used selling price.
// `price` is the new retail compare-at price and `discountPrice` is the
// realistic pre-owned/refurbished price the customer actually pays.
function retailInfo(brand, model, storage, storageVariants) {
  const selling = sellingPrice(brand, model, storage, storageVariants)
  const pad = BRAND_MRP_PAD[brandKey(brand)] || 1.1
  const mrp = round100(Math.max(selling + 200, Math.round(selling * pad / 100) * 100))
  const used = usedSellingPrice(brand, model, storage, storageVariants)
  const off = Math.round((1 - used / mrp) * 100)
  return { price: mrp, discountPrice: used, discountPercent: off }
}

module.exports = { sellingPrice, usedSellingPrice, retailInfo, referenceStorage, SELLING, STORAGE_EXTRA }