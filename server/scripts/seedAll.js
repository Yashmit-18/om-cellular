// Run: node scripts/seedAll.js
// Comprehensive seed script for OM Cellular
// Seeds: Brands, Phone Catalog Models, Repair Services, Sample Products + Variants,
//        Categories, Business Settings
// Requires MONGODB_URI env var (loaded from server/.env)

// Load environment variables from server/.env before reading any env vars.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

// Force Node.js to use reliable public DNS servers.
// Required because the system DNS resolver is returning ECONNREFUSED
// for MongoDB Atlas SRV records (matches server/src/config/database.ts).
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { computeModelBase, storageAdjust, guessRam, storageVariantBaseValue } = require('./lib/pricing')
const { resolveImageUrl } = require('./lib/catalogImages')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

// Realistic starting prices + service catalog, shared with focused seed scripts.
const { repairServices, REPAIR_PRICES } = require('./data/repairServices')
const { buildProducts, syncValuationRules } = require('./lib/productCatalog')

// Valuation rules for every catalog model are handled by lib/productCatalog.

// ─── BRANDS ───────────────────────────────────────────────────────────────────

const brands = [
  { name: 'Apple', sortOrder: 1 },
  { name: 'Samsung', sortOrder: 2 },
  { name: 'OnePlus', sortOrder: 3 },
  { name: 'Xiaomi', sortOrder: 4 },
  { name: 'Redmi', sortOrder: 5 },
  { name: 'POCO', sortOrder: 6 },
  { name: 'Realme', sortOrder: 7 },
  { name: 'Vivo', sortOrder: 8 },
  { name: 'OPPO', sortOrder: 9 },
  { name: 'Motorola', sortOrder: 10 },
  { name: 'Nothing', sortOrder: 11 },
  { name: 'Google', sortOrder: 12 },
  { name: 'iQOO', sortOrder: 13 },
  { name: 'Infinix', sortOrder: 14 },
  { name: 'Tecno', sortOrder: 15 },
  { name: 'Lava', sortOrder: 16 },
  { name: 'Nokia', sortOrder: 17 },
  { name: 'Honor', sortOrder: 18 },
  { name: 'Asus', sortOrder: 19 },
]

// ─── PHONE CATALOG MODELS ─────────────────────────────────────────────────────

const phoneModels = [
  // Apple
  { brandName: 'Apple', modelName: 'iPhone 11', storageVariants: ['64GB', '128GB', '256GB'] },
  { brandName: 'Apple', modelName: 'iPhone 11 Pro', storageVariants: ['64GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 11 Pro Max', storageVariants: ['64GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 12', storageVariants: ['64GB', '128GB', '256GB'] },
  { brandName: 'Apple', modelName: 'iPhone 12 mini', storageVariants: ['64GB', '128GB', '256GB'] },
  { brandName: 'Apple', modelName: 'iPhone 12 Pro', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 12 Pro Max', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 13', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 13 mini', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 13 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 13 Pro Max', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 14', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 14 Plus', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 14 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 14 Pro Max', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 15', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 15 Plus', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 15 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 15 Pro Max', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 16', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 16 Plus', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 16 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 16 Pro Max', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },

  // Samsung
  { brandName: 'Samsung', modelName: 'Galaxy S24 Ultra', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S23 Ultra', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S23+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S23', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S22 Ultra', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S22+', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S22', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A55', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A54', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A35', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A34', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A25', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A15', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy M55', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy M35', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy M15', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy F55', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy F35', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy F15', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy Z Fold6', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy Z Flip6', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy Z Fold5', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy Z Flip5', storageVariants: ['128GB', '256GB', '512GB'] },

  // OnePlus
  { brandName: 'OnePlus', modelName: 'OnePlus 13', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus 12', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus 12R', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus 11', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus 11R', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord 4', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord CE4', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord CE4 Lite', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord 3', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord CE3', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord CE3 Lite', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus Nord 2T', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus 10 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'OnePlus 10T', storageVariants: ['128GB', '256GB'] },

  // Xiaomi
  { brandName: 'Xiaomi', modelName: 'Xiaomi 14', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Xiaomi', modelName: 'Xiaomi 14 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Xiaomi', modelName: 'Xiaomi 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Xiaomi 13T Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Xiaomi', modelName: 'Xiaomi 13T', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Xiaomi 12', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Xiaomi 11T Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 Pro+ 5G', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 Pro 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi 13C', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi A3', storageVariants: ['64GB', '128GB'] },

  // Redmi
  { brandName: 'Redmi', modelName: 'Redmi Note 13 Pro+ 5G', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Redmi', modelName: 'Redmi Note 13 Pro 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Redmi', modelName: 'Redmi Note 13 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Redmi', modelName: 'Redmi Note 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 13C 5G', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 13C', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Redmi', modelName: 'Redmi A3', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 12', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 12C', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 11 Prime', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Redmi', modelName: 'Redmi 10 Power', storageVariants: ['128GB'] },

  // POCO
  { brandName: 'POCO', modelName: 'POCO X6 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'POCO', modelName: 'POCO X6', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO X6 Neo', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO M6 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO M6', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO M6 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO C65', storageVariants: ['64GB', '128GB'] },
  { brandName: 'POCO', modelName: 'POCO F6', storageVariants: ['256GB', '512GB'] },
  { brandName: 'POCO', modelName: 'POCO F6 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'POCO', modelName: 'POCO X5 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO M5', storageVariants: ['128GB', '256GB'] },
  { brandName: 'POCO', modelName: 'POCO C55', storageVariants: ['64GB', '128GB'] },

  // Realme
  { brandName: 'Realme', modelName: 'Realme GT 6 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: 'Realme GT 6', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme GT 5 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: 'Realme GT 5', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme 13 Pro+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: 'Realme 13 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme 13 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme 12 Pro+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: 'Realme 12 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme 12 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme Narzo 70x 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme Narzo 70 Pro 5G', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme C67', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'Realme C65', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Realme', modelName: 'Realme C53', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Realme', modelName: 'Realme C51', storageVariants: ['64GB', '128GB'] },

  // Vivo
  { brandName: 'Vivo', modelName: 'Vivo X200 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'Vivo X200', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'Vivo X100 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'Vivo X100', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'Vivo V40', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo V40 Lite', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo V30 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'Vivo V30', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo V30 Lite', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo Y28', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo Y27', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo Y18', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Vivo', modelName: 'Vivo T3', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo T3x', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Vivo T2x', storageVariants: ['128GB', '256GB'] },

  // OPPO
  { brandName: 'OPPO', modelName: 'OPPO Find X8 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OPPO', modelName: 'OPPO Find X8', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OPPO', modelName: 'OPPO Find X7 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OPPO', modelName: 'OPPO Reno 12 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OPPO', modelName: 'OPPO Reno 12', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO Reno 11F', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO Reno 11', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO A3 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO A3', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO A3x', storageVariants: ['64GB', '128GB'] },
  { brandName: 'OPPO', modelName: 'OPPO A78', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO A58', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OPPO', modelName: 'OPPO F27 Pro+', storageVariants: ['128GB', '256GB'] },

  // Motorola
  { brandName: 'Motorola', modelName: 'Moto Edge 50 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Motorola', modelName: 'Moto Edge 50 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Motorola', modelName: 'Moto Edge 50 Fusion', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto Edge 40 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Motorola', modelName: 'Moto Edge 40', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto G84', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto G74', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto G64', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto G54', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto G34', storageVariants: ['128GB'] },
  { brandName: 'Motorola', modelName: 'Moto G24', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Moto G14', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Motorola', modelName: 'Razr 50 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Motorola', modelName: 'Razr 50', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Motorola', modelName: 'Razr 40 Ultra', storageVariants: ['256GB', '512GB'] },

  // Nothing
  { brandName: 'Nothing', modelName: 'Nothing Phone 2a Plus', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Nothing', modelName: 'Nothing Phone 2a', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Nothing', modelName: 'Nothing Phone 2', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Nothing', modelName: 'Nothing Phone 1', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Nothing', modelName: 'CMF Phone 1', storageVariants: ['128GB', '256GB'] },

  // Google
  { brandName: 'Google', modelName: 'Pixel 9 Pro XL', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Google', modelName: 'Pixel 9 Pro', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Google', modelName: 'Pixel 9', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Google', modelName: 'Pixel 8a', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Google', modelName: 'Pixel 8 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Google', modelName: 'Pixel 8', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Google', modelName: 'Pixel 7a', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Google', modelName: 'Pixel 7 Pro', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Google', modelName: 'Pixel 7', storageVariants: ['128GB', '256GB'] },

  // iQOO
  { brandName: 'iQOO', modelName: 'iQOO 13', storageVariants: ['256GB', '512GB'] },
  { brandName: 'iQOO', modelName: 'iQOO 12', storageVariants: ['256GB', '512GB'] },
  { brandName: 'iQOO', modelName: 'iQOO 12 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'iQOO', modelName: 'iQOO Neo 9 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'iQOO', modelName: 'iQOO Neo 9', storageVariants: ['128GB', '256GB'] },
  { brandName: 'iQOO', modelName: 'iQOO Z9x', storageVariants: ['128GB', '256GB'] },
  { brandName: 'iQOO', modelName: 'iQOO Z9', storageVariants: ['128GB', '256GB'] },
  { brandName: 'iQOO', modelName: 'iQOO Z7s', storageVariants: ['128GB'] },

  // Infinix
  { brandName: 'Infinix', modelName: 'Infinix GT 20 Pro', storageVariants: ['256GB'] },
  { brandName: 'Infinix', modelName: 'Infinix Note 40 Pro', storageVariants: ['256GB'] },
  { brandName: 'Infinix', modelName: 'Infinix Note 40', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Infinix', modelName: 'Infinix Hot 40 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Infinix', modelName: 'Infinix Hot 40i', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Infinix', modelName: 'Infinix Hot 30i', storageVariants: ['64GB', '128GB'] },

  // Tecno
  { brandName: 'Tecno', modelName: 'Tecno Camon 30 Pro', storageVariants: ['256GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Camon 30', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Camon 20 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Spark 20 Pro+', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Spark 20 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Spark 20', storageVariants: ['128GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Pova 5 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Tecno', modelName: 'Tecno Pova 5', storageVariants: ['128GB', '256GB'] },

  // Lava
  { brandName: 'Lava', modelName: 'Lava Blaze Curve', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Lava', modelName: 'Lava Blaze Pro 5G', storageVariants: ['128GB'] },
  { brandName: 'Lava', modelName: 'Lava Blaze 2 5G', storageVariants: ['128GB'] },
  { brandName: 'Lava', modelName: 'Lava Blaze 1X', storageVariants: ['128GB'] },
  { brandName: 'Lava', modelName: 'Lava Agni 2', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Lava', modelName: 'Lava Agni 3', storageVariants: ['128GB', '256GB'] },

  // Nokia
  { brandName: 'Nokia', modelName: 'Nokia G42', storageVariants: ['128GB'] },
  { brandName: 'Nokia', modelName: 'Nokia G22', storageVariants: ['128GB'] },
  { brandName: 'Nokia', modelName: 'Nokia C32', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Nokia', modelName: 'Nokia C22', storageVariants: ['64GB', '128GB'] },
  { brandName: 'Nokia', modelName: 'Nokia 105 4G', storageVariants: ['64MB'] },

  // Honor
  { brandName: 'Honor', modelName: 'Honor 200 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Honor', modelName: 'Honor 200', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Honor', modelName: 'Honor Magic6 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Honor', modelName: 'Honor Magic6', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Honor', modelName: 'Honor X8b', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Honor', modelName: 'Honor X7b', storageVariants: ['128GB', '256GB'] },

  // Asus
  { brandName: 'Asus', modelName: 'ROG Phone 8 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'ROG Phone 8', storageVariants: ['256GB'] },
  { brandName: 'Asus', modelName: 'ROG Phone 7', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'ROG Phone 7 Ultimate', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 11 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 10', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 9', storageVariants: ['128GB', '256GB'] },
]

// ─── SAMPLE PRODUCTS ──────────────────────────────────────────────────────────
// Premium buy-products are built from the phone catalog by lib/productCatalog
// (buildProducts). No static sample product data is seeded anymore.

// ─── MAIN SEED FUNCTION ───────────────────────────────────────────────────────

async function seed() {
  const client = new MongoClient(MONGODB_URI)

  try {
    await client.connect()
    const db = client.db()
    console.log('Connected to MongoDB\n')

    // ─── 1. SEED BRANDS ─────────────────────────────────────────────────────
    console.log('Seeding brands...')
    const brandsCol = db.collection('brands')
    let brandsCreated = 0, brandsSkipped = 0

    for (const brand of brands) {
      const slug = slugify(brand.name)
      const result = await brandsCol.updateOne(
        { slug },
        {
          $setOnInsert: {
            name: brand.name,
            slug,
            isActive: true,
            sortOrder: brand.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) {
        brandsCreated++
      } else {
        brandsSkipped++
      }
    }
    console.log(`  Brands: ${brandsCreated} created, ${brandsSkipped} skipped (already exist)`)

    // ─── 2. SEED PHONE CATALOG MODELS ───────────────────────────────────────
    console.log('\nSeeding phone catalog models...')
    const phoneCol = db.collection('phonecatalogmodels')
    let modelsCreated = 0, modelsSkipped = 0

    for (const phone of phoneModels) {
      const slug = slugify(`${phone.brandName} ${phone.modelName}`)
      const existing = await phoneCol.findOne({ slug })
      const modelBase = computeModelBase(phone.brandName, phone.modelName)
      const storageVariants = phone.storageVariants.map(s => ({
        storage: s,
        ram: guessRam(modelBase + storageAdjust(s)),
        baseValue: storageVariantBaseValue(phone.brandName, phone.modelName, s),
      }))

      // Resolve a real, HTTP-verified image (reuses existing valid image).
      const image = await resolveImageUrl(phone.brandName, phone.modelName, existing?.image)
      const setFields = {
        brandName: phone.brandName,
        modelName: phone.modelName,
        storageVariants,
        isActive: true,
        sortOrder: 0,
        updatedAt: new Date(),
      }
      if (image) setFields.image = image

      const result = await phoneCol.updateOne(
        { slug },
        {
          $set: setFields,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) {
        modelsCreated++
      } else {
        modelsSkipped++
      }
    }
    console.log(`  Phone models: ${modelsCreated} created, ${modelsSkipped} skipped (already exist)`)

    // ─── 3. SEED REPAIR SERVICES ────────────────────────────────────────────
    console.log('\nSeeding repair services...')
    const repairCol = db.collection('repairservices')
    let servicesCreated = 0, servicesSkipped = 0

    for (const service of repairServices) {
      const result = await repairCol.updateOne(
        { slug: service.slug },
        {
          $set: {
            name: service.name,
            description: service.description,
            startingPrice: REPAIR_PRICES[service.slug] || 500,
            estimatedDuration: service.estimatedDuration,
            warranty: service.warranty,
            category: service.category,
            priceType: 'starting',
            isActive: true,
            sortOrder: service.sortOrder,
            updatedAt: new Date(),
          },
          $setOnInsert: {
            compatibleDevices: [],
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) {
        servicesCreated++
      } else {
        servicesSkipped++
      }
    }
    console.log(`  Repair services: ${servicesCreated} created, ${servicesSkipped} skipped (already exist)`)

    // ─── 4. SEED PREMIUM PRODUCTS + VARIANTS ────────────────────────────────
    console.log('\nSeeding premium products + variants (from phone catalog)...')
    await buildProducts(db, { log: (m) => console.log(`  ${m}`) })

    // ─── 5. SEED PHONE VALUATION RULES ──────────────────────────────────────
    console.log('\nSeeding phone valuation rules...')
    await syncValuationRules(db, { log: (m) => console.log(`  ${m}`) })

    // ─── 6. SEED CATEGORIES ─────────────────────────────────────────────────
    console.log('\nSeeding categories...')
    const categoriesCol = db.collection('categories')
    const categoriesData = [
      { name: 'Smartphones', icon: 'Smartphone', sortOrder: 1 },
      { name: 'Tablets', icon: 'Tablet', sortOrder: 2 },
      { name: 'Smartwatches', icon: 'Watch', sortOrder: 3 },
      { name: 'Accessories', icon: 'Package', sortOrder: 4 },
    ]
    let categoriesCreated = 0, categoriesSkipped = 0
    let smartphonesCategoryId = null

    for (const cat of categoriesData) {
      const slug = slugify(cat.name)
      const result = await categoriesCol.updateOne(
        { slug },
        {
          $setOnInsert: {
            name: cat.name,
            slug,
            icon: cat.icon,
            description: '',
            isActive: true,
            sortOrder: cat.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) categoriesCreated++
      else categoriesSkipped++
      if (slug === 'smartphones') {
        const doc = await categoriesCol.findOne({ slug })
        if (doc) smartphonesCategoryId = doc._id
      }
    }
    console.log(`  Categories: ${categoriesCreated} created, ${categoriesSkipped} skipped (already exist)`)

    if (smartphonesCategoryId) {
      const linked = await productsCol.updateMany(
        { categoryId: null },
        { $set: { categoryId: smartphonesCategoryId, updatedAt: new Date() } }
      )
      console.log(`  Products linked to Smartphones category: ${linked.modifiedCount}`)
    }

    // ─── 7. SEED BUSINESS SETTINGS ──────────────────────────────────────────
    console.log('\nSeeding business settings...')
    const settingsCol = db.collection('settings')
    const settingsData = [
      { key: 'business_name', value: 'OM Cellular', group: 'business' },
      { key: 'business_phone', value: '', group: 'business' },
      { key: 'business_email', value: '', group: 'business' },
      { key: 'business_address', value: 'Shop No. 8, Upper Ground Floor, Center Square Mall, Gumanpura Road, Kota, Rajasthan 324007, India', group: 'business' },
      { key: 'opening_hours', value: 'Mon-Sat: 10:00 AM - 8:00 PM', group: 'business' },
      { key: 'whatsapp_number', value: '', group: 'whatsapp' },
      { key: 'whatsapp_default_message', value: 'Hello OM Cellular, I need help with a mobile phone.', group: 'whatsapp' },
      { key: 'google_maps_url', value: 'https://maps.google.com/maps?q=Shop%20No.%208%20Upper%20Ground%20Floor%20Center%20Square%20Mall%20Gumanpura%20Road%20Kota%20Rajasthan%20324007%20India&z=16&output=embed', group: 'maps' },
      { key: 'google_maps_link', value: 'https://www.google.com/maps/search/?api=1&query=Shop%20No.%208%2C%20Upper%20Ground%20Floor%2C%20Center%20Square%20Mall%2C%20Gumanpura%20Road%2C%20Kota%2C%20Rajasthan%20324007%2C%20India', group: 'maps' },
      { key: 'facebook_url', value: '', group: 'social' },
      { key: 'instagram_url', value: '', group: 'social' },
      { key: 'footer_about', value: 'Your trusted partner for buying, selling, repairing and exchanging mobile phones.', group: 'footer' },
      { key: 'tax_rate', value: '0.18', group: 'commerce' },
      { key: 'free_shipping_threshold', value: '999', group: 'commerce' },
      { key: 'standard_shipping_price', value: '99', group: 'commerce' },
      { key: 'upi_id', value: '', group: 'payment' },
      { key: 'upi_display_name', value: '', group: 'payment' },
      { key: 'upi_qr_image', value: '', group: 'payment' },
      { key: 'repair_pickup_drop_fee', value: '99', group: 'repair' },
    ]
    let settingsCreated = 0, settingsSkipped = 0

    for (const s of settingsData) {
      const result = await settingsCol.updateOne(
        { key: s.key },
        {
          $setOnInsert: {
            key: s.key,
            value: s.value,
            group: s.group,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { upsert: true }
      )
      if (result.upsertedCount > 0) settingsCreated++
      else settingsSkipped++
    }
    console.log(`  Settings: ${settingsCreated} created, ${settingsSkipped} skipped (already exist)`)
    console.log('  NOTE: Set business_phone, business_email, business_address and whatsapp_number from Admin > Settings.')

    // ─── SUMMARY ────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(50))
    console.log('SEED COMPLETE')
    console.log('='.repeat(50))
    console.log(`  Brands:           ${brandsCreated} created, ${brandsSkipped} skipped`)
    console.log(`  Phone models:     ${modelsCreated} created, ${modelsSkipped} skipped`)
    console.log(`  Repair services:  ${servicesCreated} created, ${servicesSkipped} skipped`)
    console.log(`  Products:         synced by buildProducts (see detail above)`)
    console.log(`  Valuation rules:  synced for all catalog models (see detail above)`)
    console.log(`  Categories:       ${categoriesCreated} created, ${categoriesSkipped} skipped`)
    console.log(`  Settings:         ${settingsCreated} created, ${settingsSkipped} skipped`)
    console.log('='.repeat(50))
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
    console.log('\nMongoDB connection closed')
  }
}

seed()
