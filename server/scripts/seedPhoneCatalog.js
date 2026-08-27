// Run: node scripts/seedPhoneCatalog.js
// Seeds the phone catalog collection with popular Indian phone models
// Requires MONGODB_URI env var or defaults to the .env value

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://yashsharmaa92_db_user:7S2v8vsKudrWx5hm@cluster0.wgqisum.mongodb.net/?appName=Cluster0'

const phones = [
  { brandName: 'Apple', modelName: 'iPhone 15 Pro Max', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 15 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Apple', modelName: 'iPhone 15', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 14', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Apple', modelName: 'iPhone 13', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24 Ultra', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S24', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S23 Ultra', storageVariants: ['256GB', '512GB', '1TB'] },
  { brandName: 'Samsung', modelName: 'Galaxy S23', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A55', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A35', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Samsung', modelName: 'Galaxy A15', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 Pro+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13 Pro', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi Note 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Xiaomi', modelName: 'Redmi 13', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: '12', storageVariants: ['256GB', '512GB'] },
  { brandName: 'OnePlus', modelName: '12R', storageVariants: ['128GB', '256GB'] },
  { brandName: 'OnePlus', modelName: 'Nord CE 4', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'V30 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Vivo', modelName: 'V30', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Vivo', modelName: 'Y28', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Realme', modelName: 'GT 6 Pro', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: '12 Pro+', storageVariants: ['256GB', '512GB'] },
  { brandName: 'Realme', modelName: 'C67', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Nothing', modelName: 'Phone (2a)', storageVariants: ['128GB', '256GB'] },
  { brandName: 'Nothing', modelName: 'Phone (2)', storageVariants: ['128GB', '256GB', '512GB'] },
  { brandName: 'Google', modelName: 'Pixel 8 Pro', storageVariants: ['128GB', '256GB', '512GB', '1TB'] },
  { brandName: 'Google', modelName: 'Pixel 8a', storageVariants: ['128GB', '256GB'] },
]

async function seed() {
  const client = new MongoClient(MONGODB_URI)
  try {
    await client.connect()
    const db = client.db()
    const col = db.collection('phonecatalogmodels')
    let created = 0, skipped = 0
    for (const phone of phones) {
      const slug = `${phone.brandName}-${phone.modelName}`.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      const existing = await col.findOne({ slug })
      if (existing) { skipped++; continue }
      await col.insertOne({
        brandName: phone.brandName,
        modelName: phone.modelName,
        slug,
        storageVariants: phone.storageVariants,
        isActive: true,
        sortOrder: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      created++
    }
    console.log(`Seed complete: ${created} created, ${skipped} skipped`)
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()
