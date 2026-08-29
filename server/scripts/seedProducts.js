// Run: node scripts/seedProducts.js
// Seeds the sample buy-phone products (brands required first).
// Idempotent: skips products that already exist by slug; inserts variants by sku.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { sampleProducts } = require('./data/sampleProducts')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function seed() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    const brandsCol = db.collection('brands')
    const productsCol = db.collection('products')
    const variantsCol = db.collection('productvariants')
    let productsCreated = 0, productsSkipped = 0, variantsCreated = 0

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
      const variantExists = await variantsCol.findOne({ sku: v.sku })
      if (!variantExists) {
        await variantsCol.insertOne({
          productId,
          name: v.name,
          sku: v.sku,
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
        variantsCreated++
      }
      productsCreated++
    }

    console.log(`Products seed complete: ${productsCreated} created, ${productsSkipped} skipped, ${variantsCreated} variants created`)
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()