// Run: node scripts/addProductImages.js
// Backfills the `images` array on existing products/variants that have none,
// so the live catalog never renders broken images. Idempotent: only touches
// documents whose images array is empty/missing.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

function productImages(name) {
  const palette = [
    ['1d4ed8', 'ffffff'],
    ['0f766e', 'ffffff'],
    ['7c3aed', 'ffffff'],
    ['d97706', 'ffffff'],
    ['be123c', 'ffffff'],
    ['334155', 'ffffff'],
  ]
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const [fg, bg] = palette[hash % palette.length]
  const text = encodeURIComponent(name.replace(/&/g, 'and'))
  return [`https://placehold.co/600x600/${fg}/${bg}/png?text=${text}`]
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    const productsCol = db.collection('products')
    const variantsCol = db.collection('productvariants')

    const products = await productsCol.find({}).toArray()
    let productsUpdated = 0, variantsUpdated = 0

    for (const product of products) {
      if (!Array.isArray(product.images) || product.images.length === 0) {
        const images = productImages(product.name || 'Phone')
        await productsCol.updateOne({ _id: product._id }, { $set: { images } })
        productsUpdated++
      }

      const variants = await variantsCol.find({ productId: product._id }).toArray()
      for (const variant of variants) {
        if (!Array.isArray(variant.images) || variant.images.length === 0) {
          await variantsCol.updateOne({ _id: variant._id }, { $set: { images: productImages(product.name || 'Phone') } })
          variantsUpdated++
        }
      }
    }

    console.log(`Images backfilled: ${productsUpdated} products, ${variantsUpdated} variants (${products.length} products scanned)`)
  } catch (e) {
    console.error('Migration failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()