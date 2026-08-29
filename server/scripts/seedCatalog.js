// Run: node scripts/seedCatalog.js
// Orchestrates the full premium catalog production sync:
//   1. Phone catalog models  (phones)
//   2. Verified real images  (images)
//   3. Buy products + variants + phone valuations  (products)
// All steps are idempotent, production-safe (no deletes, no placeholder images).

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { runPhoneCatalog } = require('./seedPhoneCatalog')
const { runImageBackfill } = require('./seedCatalogImages')
const { buildProducts, syncValuationRules } = require('./lib/productCatalog')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()

    console.log('\n=== STEP 1/3: PHONE CATALOG MODELS ===')
    await runPhoneCatalog(db)

    console.log('\n=== STEP 2/3: REAL IMAGE BACKFILL ===')
    await runImageBackfill(db, { concurrency: 3 })

    console.log('\n=== STEP 3/3: PRODUCTS + VARIANTS + VALUATIONS ===')
    await buildProducts(db, { log: (m) => console.log(m) })
    await syncValuationRules(db, { log: (m) => console.log(m) })

    console.log('\n' + '='.repeat(50))
    console.log('CATALOG SEED COMPLETE')
    console.log('='.repeat(50))
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()