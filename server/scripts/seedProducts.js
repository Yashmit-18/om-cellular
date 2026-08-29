// Run: node scripts/seedProducts.js
// Builds the premium buy-phones catalog (products + variants + valuations)
// from the phone catalog models. Requires phonecatalogmodels to be seeded.
// Idempotent: upserts by product slug / variant sku, never deletes.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { buildProducts, syncValuationRules } = require('./lib/productCatalog')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

async function seed() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    await buildProducts(db, { log: (m) => console.log(m) })
    await syncValuationRules(db, { log: (m) => console.log(m) })
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

seed()