// Run: node scripts/seedCatalogImages.js
// Backfills verified, real product images onto every phone catalog model that
// is missing one (or whose stored image no longer resolves).
//
// SAFETY:
//  - Idempotent: only ever $sets the `image` field; never touches other fields.
//  - Never overwrites an existing valid image.
//  - Only real, HTTP-verified image URLs are written (no placeholders).

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { resolveMany, verifyImageUrl } = require('./lib/catalogImages')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

async function runImageBackfill(db, { concurrency = 3, log = console.log } = {}) {
  const col = db.collection('phonecatalogmodels')

  const models = await col.find({}).toArray()
  const touching = []
  for (const m of models) {
    if (m.image) {
      const ok = await verifyImageUrl(m.image)
      if (ok) continue
    }
    touching.push({ brand: m.brandName, model: m.modelName, _id: m._id, existing: m.image })
  }

  log(`Models in catalog: ${models.length}, need image backfill: ${touching.length}`)

  let updated = 0
  let failed = 0
  const byBrand = {}

  const results = await resolveMany(
    touching.map(t => ({ brand: t.brand, model: t.model, existing: t.existing })),
    (idx, total, brand, model, image) => {
      if (!image) failed++
      else updated++
      byBrand[brand] = byBrand[brand] || { total: 0, withImage: 0 }
      if (idx % 10 === 0 || idx === total) log(`  [${idx}/${total}]`)
    },
    { concurrency }
  )

  for (let i = 0; i < touching.length; i++) {
    const t = touching[i]
    const res = results[i]
    if (res.image) {
      await col.updateOne({ _id: t._id }, { $set: { image: res.image } })
    }
    byBrand[t.brand] = byBrand[t.brand] || { total: 0, withImage: 0 }
  }

  // Per-brand coverage summary
  for (const m of models) {
    byBrand[m.brandName] = byBrand[m.brandName] || { total: 0, withImage: 0 }
  }
  let grandTotal = 0
  let grandWith = 0
  for (const [brand, s] of Object.entries(byBrand)) {
    const total = await col.countDocuments({ brandName: brand })
    const withImage = await col.countDocuments({ brandName: brand, image: { $ne: '', $exists: true } })
    s.total = total
    s.withImage = withImage
    grandTotal += total
    grandWith += withImage
    log(`${brand}: ${withImage}/${total} with image`)
  }
  log(`\nTOTAL: ${grandWith}/${grandTotal} models have a verified image`)
  log(`Backfilled ${updated}, failed ${failed}`)
  return { updated, failed, total: grandTotal, withImage: grandWith }
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    await runImageBackfill(db)
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

module.exports = { runImageBackfill }

if (require.main === module) {
  main()
}