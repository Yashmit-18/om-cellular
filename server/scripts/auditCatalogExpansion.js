// Run: node scripts/auditCatalogExpansion.js
// Read-only audit of the live catalog after the D12 expansion seed.
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

;(async () => {
  const client = new MongoClient(MONGODB_URI)
  await client.connect()
  const db = client.db()

  const categories = await db.collection('categories').find({ isActive: true }).toArray()
  const catById = new Map(categories.map(c => [String(c._id), c]))

  const products = await db.collection('products').find({ isActive: true }).toArray()
  const variants = await db.collection('productvariants').find({ isActive: true }).toArray()

  const byCat = new Map()
  for (const p of products) {
    const cat = catById.get(String(p.categoryId))
    const key = cat ? cat.name : '(none)'
    if (!byCat.has(key)) byCat.set(key, { count: 0, noImage: 0, min: Infinity, max: 0, variants: 0 })
    const b = byCat.get(key)
    b.count++
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : []
    if (!imgs.length) b.noImage++
  }

  for (const v of variants) {
    const p = products.find(pp => String(pp._id) === String(v.productId))
    if (!p) continue
    const cat = catById.get(String(p.categoryId))
    const key = cat ? cat.name : '(none)'
    const b = byCat.get(key)
    if (!b) continue
    b.variants++
    const price = v.discountPrice > 0 ? v.discountPrice : v.price
    if (price > 0) { b.min = Math.min(b.min, price); b.max = Math.max(b.max, price) }
  }

  console.log(`Active categories: ${categories.map(c => c.name).join(', ')}`)
  console.log(`Active products: ${products.length} | active variants: ${variants.length}`)
  for (const [name, b] of [...byCat.entries()].sort((a, b2) => b2[1].count - a[1].count)) {
    const range = b.min === Infinity ? 'n/a' : `Rs.${b.min}-${b.max}`
    console.log(`  ${name.padEnd(14)} products=${String(b.count).padStart(3)} variants=${String(b.variants).padStart(3)} noImage=${String(b.noImage).padStart(3)} price=${range}`)
  }

  const expansion = require('./data/catalogExpansion.json')
  const slugs = expansion.map(m => m.slug)
  const found = await db.collection('products').countDocuments({ slug: { $in: slugs } })
  const models = await db.collection('phonecatalogmodels').countDocuments({ slug: { $in: slugs } })
  console.log(`Expansion: ${expansion.length} defined | ${models} catalog models | ${found} products`)

  await client.close()
})().catch(err => { console.error(err); process.exit(1) })
