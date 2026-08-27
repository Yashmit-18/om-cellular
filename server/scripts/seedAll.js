// Run: node scripts/seedAll.js
// Comprehensive seed script for OM Cellular
// Seeds: Brands, Phone Catalog Models, Repair Services, Sample Products + Variants
// Requires MONGODB_URI env var

const { MongoClient, ObjectId } = require('mongodb')

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
  { brandName: 'Asus', modelName: 'Zenfone 11 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 10', storageVariants: ['128GB', '256GB'] },
]

// ─── REPAIR SERVICES ──────────────────────────────────────────────────────────

const repairServices = [
  { name: 'Display Replacement', slug: 'display-replacement', description: 'Professional screen replacement with genuine quality displays', category: 'Screen', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 1 },
  { name: 'Screen Replacement', slug: 'screen-replacement', description: 'Replace cracked or damaged screens', category: 'Screen', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 2 },
  { name: 'Battery Replacement', slug: 'battery-replacement', description: 'Replace worn-out batteries to restore battery life', category: 'Battery', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 3 },
  { name: 'Charging Port Repair', slug: 'charging-port-repair', description: 'Fix loose or damaged charging ports', category: 'Charging', estimatedDuration: '2-3 hours', warranty: '90 days', sortOrder: 4 },
  { name: 'Charging Issue Diagnosis', slug: 'charging-issue-diagnosis', description: 'Diagnose and fix various charging problems', category: 'Charging', estimatedDuration: '1-2 hours', warranty: '30 days', sortOrder: 5 },
  { name: 'Back Glass Replacement', slug: 'back-glass-replacement', description: 'Replace cracked or shattered back glass panels', category: 'Hardware', estimatedDuration: '2-3 hours', warranty: '90 days', sortOrder: 6 },
  { name: 'Camera Repair', slug: 'camera-repair', description: 'Fix malfunctioning rear or front cameras', category: 'Hardware', estimatedDuration: '2-4 hours', warranty: '90 days', sortOrder: 7 },
  { name: 'Camera Glass Replacement', slug: 'camera-glass-replacement', description: 'Replace scratched or cracked camera lens glass', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 8 },
  { name: 'Speaker Repair', slug: 'speaker-repair', description: 'Fix distorted or non-functional speakers', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 9 },
  { name: 'Microphone Repair', slug: 'microphone-repair', description: 'Fix microphone not working or poor audio quality', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 10 },
  { name: 'Earpiece Repair', slug: 'earpiece-repair', description: 'Fix earpiece speaker issues during calls', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 11 },
  { name: 'Power Button Repair', slug: 'power-button-repair', description: 'Fix unresponsive power buttons', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 12 },
  { name: 'Volume Button Repair', slug: 'volume-button-repair', description: 'Fix stuck or unresponsive volume buttons', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 13 },
  { name: 'Vibration Repair', slug: 'vibration-repair', description: 'Fix vibration motor issues', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 14 },
  { name: 'Water Damage Repair', slug: 'water-damage-repair', description: 'Professional water damage treatment and recovery', category: 'Water Damage', estimatedDuration: '24-48 hours', warranty: '30 days', sortOrder: 15 },
  { name: 'Dead Phone Repair', slug: 'dead-phone-repair', description: 'Diagnose and repair phones that won\'t turn on', category: 'Other', estimatedDuration: '24-72 hours', warranty: '30 days', sortOrder: 16 },
  { name: 'Motherboard Repair', slug: 'motherboard-repair', description: 'Advanced motherboard-level diagnostics and repair', category: 'Motherboard', estimatedDuration: '48-72 hours', warranty: '30 days', sortOrder: 17 },
  { name: 'Network/Signal Repair', slug: 'network-signal-repair', description: 'Fix network connectivity and signal issues', category: 'Hardware', estimatedDuration: '2-4 hours', warranty: '90 days', sortOrder: 18 },
  { name: 'Software Repair', slug: 'software-repair', description: 'Fix software issues, boot loops, and crashes', category: 'Software', estimatedDuration: '1-3 hours', warranty: '30 days', sortOrder: 19 },
  { name: 'OS Installation', slug: 'os-installation', description: 'Clean operating system installation and setup', category: 'Software', estimatedDuration: '1-2 hours', warranty: '30 days', sortOrder: 20 },
  { name: 'Phone Formatting', slug: 'phone-formatting', description: 'Complete phone reset and data wipe', category: 'Software', estimatedDuration: '1 hour', warranty: 'No warranty', sortOrder: 21 },
  { name: 'Data Recovery', slug: 'data-recovery', description: 'Recover lost data from damaged devices', category: 'Data', estimatedDuration: '24-72 hours', warranty: 'No warranty', sortOrder: 22 },
  { name: 'Data Transfer', slug: 'data-transfer', description: 'Transfer data between devices safely', category: 'Data', estimatedDuration: '1-2 hours', warranty: 'No warranty', sortOrder: 23 },
  { name: 'Boot Loop Repair', slug: 'boot-loop-repair', description: 'Fix phones stuck in boot loop', category: 'Software', estimatedDuration: '2-4 hours', warranty: '30 days', sortOrder: 24 },
  { name: 'Phone Not Turning On', slug: 'phone-not-turning-on', description: 'Diagnose and fix phones that won\'t power on', category: 'Other', estimatedDuration: '24-72 hours', warranty: '30 days', sortOrder: 25 },
  { name: 'Overheating Diagnosis', slug: 'overheating-diagnosis', description: 'Diagnose and fix overheating issues', category: 'Other', estimatedDuration: '2-4 hours', warranty: '30 days', sortOrder: 26 },
  { name: 'Fingerprint Repair', slug: 'fingerprint-repair', description: 'Fix fingerprint sensor issues', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 27 },
  { name: 'Face ID Diagnosis', slug: 'face-id-diagnosis', description: 'Diagnose and fix Face ID / face unlock issues', category: 'Hardware', estimatedDuration: '2-4 hours', warranty: '90 days', sortOrder: 28 },
  { name: 'Proximity Sensor Repair', slug: 'proximity-sensor-repair', description: 'Fix proximity sensor not working during calls', category: 'Hardware', estimatedDuration: '1-2 hours', warranty: '90 days', sortOrder: 29 },
  { name: 'Bluetooth/WiFi Repair', slug: 'bluetooth-wifi-repair', description: 'Fix Bluetooth and WiFi connectivity issues', category: 'Hardware', estimatedDuration: '2-3 hours', warranty: '90 days', sortOrder: 30 },
]

// ─── SAMPLE PRODUCTS ──────────────────────────────────────────────────────────

const sampleProducts = [
  {
    name: 'Apple iPhone 15',
    description: 'The Apple iPhone 15 features the Dynamic Island, a 48MP main camera system, USB-C connectivity, and the powerful A16 Bionic chip. Available in multiple stunning finishes, it delivers exceptional performance and photography capabilities.',
    brandSlug: 'apple',
    isFeatured: true,
    isNewArrival: true,
    warranty: '1 Year Apple Warranty',
    returnPolicy: '7 Days Return Policy',
    variant: {
      name: 'iPhone 15 128GB Black',
      sku: 'APL-IP15-128-BLK',
      price: 79900,
      discountPrice: 75900,
      stock: 10,
      ram: '6GB',
      storage: '128GB',
      color: 'Black',
    },
  },
  {
    name: 'Samsung Galaxy S24',
    description: 'Samsung Galaxy S24 comes with Galaxy AI built-in, featuring Live Translate, Circle to Search, and Generative Edit. Equipped with a 50MP camera, Dynamic AMOLED 2X display, and Snapdragon 8 Gen 3 processor for flagship performance.',
    brandSlug: 'samsung',
    isFeatured: true,
    isNewArrival: true,
    warranty: '1 Year Samsung Warranty',
    returnPolicy: '7 Days Return Policy',
    variant: {
      name: 'Galaxy S24 128GB Onyx Black',
      sku: 'SAM-GS24-128-OBLK',
      price: 74999,
      discountPrice: 69999,
      stock: 8,
      ram: '8GB',
      storage: '128GB',
      color: 'Onyx Black',
    },
  },
  {
    name: 'OnePlus 12',
    description: 'OnePlus 12 features the Snapdragon 8 Gen 3 processor, a Hasselblad-tuned 50MP triple camera system, 100W SUPERVOOC charging, and a stunning 2K ProXDR display. A true flagship killer with premium build quality.',
    brandSlug: 'oneplus',
    isFeatured: true,
    isNewArrival: false,
    warranty: '1 Year OnePlus Warranty',
    returnPolicy: '7 Days Return Policy',
    variant: {
      name: 'OnePlus 12 256GB Flowy Emerald',
      sku: 'OPL-12-256-FEMR',
      price: 69999,
      discountPrice: 64999,
      stock: 12,
      ram: '12GB',
      storage: '256GB',
      color: 'Flowy Emerald',
    },
  },
  {
    name: 'Xiaomi Redmi Note 13 Pro+ 5G',
    description: 'Redmi Note 13 Pro+ 5G packs a 200MP camera with OIS, MediaTek Dimensity 7200 Ultra chipset, 120Hz 3D Curved AMOLED display, and 120W HyperCharge fast charging. Premium mid-range at an unbeatable price.',
    brandSlug: 'xiaomi',
    isFeatured: false,
    isNewArrival: false,
    warranty: '1 Year Xiaomi Warranty',
    returnPolicy: '7 Days Return Policy',
    variant: {
      name: 'Redmi Note 13 Pro+ 5G 256GB Fusion Purple',
      sku: 'XIA-RN13PP-256-FPUR',
      price: 32999,
      discountPrice: 29999,
      stock: 15,
      ram: '8GB',
      storage: '256GB',
      color: 'Fusion Purple',
    },
  },
  {
    name: 'Realme GT 6 Pro',
    description: 'Realme GT 6 Pro is powered by the Snapdragon 8s Gen 3 chipset with a 5500mAh battery and 120W SUPERVOOC charging. Features a 50MP Sony LYT-808 OIS camera and a 6000-nit ultra-bright display for an immersive experience.',
    brandSlug: 'realme',
    isFeatured: false,
    isNewArrival: true,
    warranty: '1 Year Realme Warranty',
    returnPolicy: '7 Days Return Policy',
    variant: {
      name: 'Realme GT 6 Pro 256GB Razor Green',
      sku: 'REL-GT6P-256-RGRN',
      price: 39999,
      discountPrice: 36999,
      stock: 7,
      ram: '12GB',
      storage: '256GB',
      color: 'Razor Green',
    },
  },
  {
    name: 'Vivo V40',
    description: 'Vivo V40 features ZEISS co-engineered cameras, a 5500mAh slim battery, Snapdragon 7 Gen 3 processor, and a 120Hz AMOLED display. Designed for portrait photography with professional-grade image processing.',
    brandSlug: 'vivo',
    isFeatured: false,
    isNewArrival: true,
    warranty: '1 Year Vivo Warranty',
    returnPolicy: '7 Days Return Policy',
    variant: {
      name: 'Vivo V40 256GB Lotus Purple',
      sku: 'VIV-V40-256-LPUR',
      price: 41999,
      discountPrice: 38999,
      stock: 9,
      ram: '8GB',
      storage: '256GB',
      color: 'Lotus Purple',
    },
  },
]

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
      const storageVariants = phone.storageVariants.map(s => ({
        storage: s,
        ram: '',
        baseValue: 0,
      }))

      const result = await phoneCol.updateOne(
        { slug },
        {
          $setOnInsert: {
            brandName: phone.brandName,
            modelName: phone.modelName,
            slug,
            storageVariants,
            isActive: true,
            sortOrder: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
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
          $setOnInsert: {
            name: service.name,
            slug: service.slug,
            description: service.description,
            startingPrice: 0,
            estimatedDuration: service.estimatedDuration,
            warranty: service.warranty,
            compatibleDevices: [],
            category: service.category,
            priceType: 'starting',
            isActive: true,
            sortOrder: service.sortOrder,
            createdAt: new Date(),
            updatedAt: new Date(),
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

    // ─── 4. SEED SAMPLE PRODUCTS + VARIANTS ─────────────────────────────────
    console.log('\nSeeding sample products...')
    const productsCol = db.collection('products')
    const variantsCol = db.collection('productvariants')
    let productsCreated = 0, productsSkipped = 0

    for (const product of sampleProducts) {
      const slug = slugify(product.name)
      const existing = await productsCol.findOne({ slug })

      if (existing) {
        productsSkipped++
        continue
      }

      const brand = await brandsCol.findOne({ slug: product.brandSlug })
      const brandId = brand ? brand._id : null

      const now = new Date()
      const insertResult = await productsCol.insertOne({
        name: product.name,
        slug,
        description: product.description,
        brandId,
        categoryId: null,
        isFeatured: product.isFeatured || false,
        isNewArrival: product.isNewArrival || false,
        isBestSeller: false,
        isRefurbished: false,
        condition: 'New',
        warranty: product.warranty || '',
        returnPolicy: product.returnPolicy || '',
        seoTitle: product.name,
        seoDescription: product.description,
        seoKeywords: product.name.toLowerCase(),
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })

      const productId = insertResult.insertedId
      const v = product.variant
      const variantSku = v.sku

      const variantExists = await variantsCol.findOne({ sku: variantSku })
      if (!variantExists) {
        await variantsCol.insertOne({
          productId,
          name: v.name,
          sku: variantSku,
          price: v.price,
          discountPrice: v.discountPrice,
          stock: v.stock,
          reservedStock: 0,
          soldCount: 0,
          ram: v.ram,
          storage: v.storage,
          color: v.color,
          condition: 'New',
          images: [],
          specifications: [],
          whatsIncluded: [],
          isRefurbished: false,
          featured: true,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        })
      }

      productsCreated++
    }
    console.log(`  Products: ${productsCreated} created, ${productsSkipped} skipped (already exist)`)

    // ─── SUMMARY ────────────────────────────────────────────────────────────
    console.log('\n' + '='.repeat(50))
    console.log('SEED COMPLETE')
    console.log('='.repeat(50))
    console.log(`  Brands:           ${brandsCreated} created, ${brandsSkipped} skipped`)
    console.log(`  Phone models:     ${modelsCreated} created, ${modelsSkipped} skipped`)
    console.log(`  Repair services:  ${servicesCreated} created, ${servicesSkipped} skipped`)
    console.log(`  Products:         ${productsCreated} created, ${productsSkipped} skipped`)
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
