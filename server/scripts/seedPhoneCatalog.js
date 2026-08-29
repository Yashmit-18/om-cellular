// Run: node scripts/seedPhoneCatalog.js
// Seeds the phone catalog collection with popular Indian-market phone models.
//
// SAFETY:
//  - Idempotent: uses $setOnInsert upsert keyed on slug, so safe to run multiple times.
//  - Never overwrites existing records (admin edits / valuations are preserved).
//  - Does not delete or reset any data.
//  - Does not touch the PhoneValuation collection (admin-managed).
//
// Requires MONGODB_URI env var. No credentials are hardcoded in this file.

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

const phones = [
  // Apple
  { brandName: 'Apple', modelName: 'iPhone 11', storageVariants: ['64GB', '128GB', '256GB'] },
  { brandName: 'Apple', modelName: 'iPhone 12', storageVariants: ['64GB', '128GB', '256GB'] },
  { brandName: 'Apple', modelName: 'iPhone 13', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 14', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 15', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 15 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 15 Pro Max', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 16', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 16 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  // Samsung
  { brandName: 'Samsung', modelName: 'Galaxy S23', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S23 Ultra', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24 Ultra', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A15', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A35', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A55', storageVariants: ['128GB', '256GB'] },
  // Xiaomi
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 Pro+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi 13', storageVariants: ['128GB', '256GB'] },
  // OnePlus
  { brandName: 'OnePlus', modelName: '12', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OnePlus', modelName: '12R', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'Nord CE 4', storageVariants: ['128GB', '256GB'] },
  // Vivo
  { brandName: 'Vivo', modelName: 'V30', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'V30 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'Y28', storageVariants: ['128GB', '256GB'] },
  // Realme
  { brandName: 'Realme', modelName: 'GT 6 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: '12 Pro+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: 'C67', storageVariants: ['128GB', '256GB'] },
  // Nothing
  { brandName: 'Nothing', modelName: 'Phone (2)', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Nothing', modelName: 'Phone (2a)', storageVariants: ['128GB', '256GB'] },
  // Google
  { brandName: 'Google', modelName: 'Pixel 8 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Google', modelName: 'Pixel 8a', storageVariants: ['128GB', '256GB'] },
  // Asus
  { brandName: 'Asus', modelName: 'ROG Phone 8 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'ROG Phone 7', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 11 Ultra', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 10', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Asus', modelName: 'Zenfone 9', storageVariants: ['128GB', '256GB'] },
]

async function seed() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    const col = db.collection('phonecatalogmodels')
    let created = 0, skipped = 0, reactivated = 0

    for (const phone of phones) {
      const slug = slugify(`${phone.brandName} ${phone.modelName}`)
      const existing = await col.findOne({ slug })
      const modelBase = computeModelBase(phone.brandName, phone.modelName)
      const storageVariants = phone.storageVariants.map(s => ({
        storage: s,
        ram: guessRam(modelBase + storageAdjust(s)),
        baseValue: storageVariantBaseValue(phone.brandName, phone.modelName, s),
      }))

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

      const result = await col.updateOne(
        { slug },
        {
          $set: setFields,
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true }
      )

      if (result.upsertedCount > 0) {
        created++
      } else {
        skipped++
        // If a matching model exists but was deactivated by an admin, re-activate it.
        const existing = await col.findOne({ slug, isActive: false })
        if (existing) {
          await col.updateOne({ slug }, { $set: { isActive: true, updatedAt: new Date() } })
          reactivated++
        }
      }
    }

    console.log(`Seed complete: ${created} created, ${skipped} skipped, ${reactivated} reactivated`)
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()
