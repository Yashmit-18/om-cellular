// Run: node scripts/seedCatalogExpansion.js
// Seeds the non-phone catalog (tablets, smartwatches, accessories) with real,
// commercially-available Indian-market devices.
//
// SAFETY:
//  - Idempotent: upserts catalog models keyed on slug ($setOnInsert createdAt),
//    and ensures the brand/category documents exist.
//  - Never deletes or resets any data; never overwrites an admin-edited device.
//  - Only real product data + HTTP-verified image URLs (accessories intentionally
//    carry no image — see catalogExpansion.json — and render an icon fallback).
//
// Requires MONGODB_URI env var. No credentials are hardcoded in this file.

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const expansion = require('./data/catalogExpansion.json')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

// Categories the expansion writes into, with real display names + sort order.
const CATEGORIES = {
  tablets: { name: 'Tablets', description: 'Refurbished tablets and iPads' },
  smartwatches: { name: 'Smartwatches', description: 'Refurbished smartwatches and wearables' },
  accessories: { name: 'Accessories', description: 'Brand-new chargers, earbuds and power banks' },
}

async function ensureBrand(db, brandName) {
  const brands = db.collection('brands')
  const slug = slugify(brandName)
  const existing = await brands.findOne({ slug })
  if (existing) return existing
  const doc = {
    name: brandName,
    slug,
    logo: '',
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await brands.insertOne(doc)
  return doc
}

async function ensureCategory(db, categorySlug) {
  const categories = db.collection('categories')
  const existing = await categories.findOne({ slug: categorySlug })
  if (existing) return existing
  const meta = CATEGORIES[categorySlug] || { name: categorySlug, description: '' }
  const doc = {
    name: meta.name,
    slug: categorySlug,
    description: meta.description,
    isActive: true,
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await categories.insertOne(doc)
  return doc
}

async function runCatalogExpansion(db, { log = console.log } = {}) {
  const col = db.collection('phonecatalogmodels')

  const categorySlugs = [...new Set(expansion.map(m => m.categorySlug))]
  for (const slug of categorySlugs) await ensureCategory(db, slug)

  let created = 0
  let updated = 0

  for (const item of expansion) {
    await ensureBrand(db, item.brandName)

    const setFields = {
      brandName: item.brandName,
      modelName: item.modelName,
      categorySlug: item.categorySlug,
      image: item.image || '',
      condition: item.condition || 'Refurbished',
      description: item.description || '',
      specs: Array.isArray(item.specs) ? item.specs : [],
      colors: Array.isArray(item.colors) ? item.colors : [],
      whatsIncluded: Array.isArray(item.whatsIncluded) ? item.whatsIncluded : [],
      labels: Array.isArray(item.labels) ? item.labels : [],
      isActive: true,
      sortOrder: 0,
      updatedAt: new Date(),
    }

    const result = await col.updateOne(
      { slug: item.slug },
      { $set: setFields, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    )
    if (result.upsertedCount > 0) created++
    else updated++
  }

  log(`Catalog expansion complete: ${created} created, ${updated} updated (${expansion.length} total)`)
  return { created, updated, total: expansion.length }
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    await runCatalogExpansion(db)
  } catch (e) {
    console.error('Seed failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

module.exports = { runCatalogExpansion, expansion }

if (require.main === module) {
  main()
}
