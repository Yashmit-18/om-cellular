// Run: node scripts/auditCatalogImages.js
// READ-ONLY audit of the live catalog + storefront image data. Never writes.
// Prints:
//  - collection counts (catalog models, products, variants, brands)
//  - every catalog model with its stored image URL
//  - verification result for every distinct catalog + product image URL
//  - products with missing/broken/placeholder primary images

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { verifyImageUrl } = require('./lib/catalogImages')

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

const PLACEHOLDER = /placehold\.co|\/placeholder/

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()

    const catalogs = await db.collection('phonecatalogmodels').find({}).sort({ brandName: 1, sortOrder: 1, modelName: 1 }).toArray()
    const products = await db.collection('products').find({}).toArray()
    const activeProducts = products.filter(p => p.isActive)
    const variants = await db.collection('productvariants').find({ isActive: true }).toArray()
    const brands = await db.collection('brands').find({}).toArray()

    const byBrand = {}
    for (const m of catalogs) {
      byBrand[m.brandName] = (byBrand[m.brandName] || 0) + 1
    }

    console.log('================ COUNTS ================')
    console.log(`catalog models (all):        ${catalogs.length}`)
    console.log(`catalog models (isActive):   ${catalogs.filter(c => c.isActive).length}`)
    console.log(`products (all):              ${products.length}`)
    console.log(`products (isActive):         ${activeProducts.length}`)
    console.log(`variants (isActive):         ${variants.length}`)
    console.log(`brands:                      ${brands.length}`)
    console.log('\n--- catalog models per brand ---')
    for (const [b, n] of Object.entries(byBrand).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${b}: ${n}`)
    }

    const activeCat = catalogs.filter(c => c.isActive)
    const noImage = activeCat.filter(c => !c.image)
    console.log(`\nactive catalog models with NO image: ${noImage.length}`)
    for (const c of noImage) console.log(`  ${c.brandName} ${c.modelName} (${c.slug})`)

    // Every distinct image URL used by catalog models + active products.
    const urlSet = new Map() // url -> first owner label
    for (const c of activeCat) {
      if (c.image) {
        if (!urlSet.has(c.image)) urlSet.set(c.image, `catalog:${c.slug}`)
      }
    }
    const catSlugByProduct = new Map()
    for (const p of activeProducts) {
      if (p.catalogModelSlug) catSlugByProduct.set(p.catalogModelSlug, p.slug)
    }
    for (const p of activeProducts) {
      const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : []
      for (const u of imgs) {
        if (!urlSet.has(u)) urlSet.set(u, `product:${p.slug}`)
      }
    }

    console.log(`\n================ URL VERIFICATION (${urlSet.size} distinct URLs) ================`)
    let ok = 0
    let broken = 0
    const brokenList = []
    let i = 0
    for (const [url, owner] of urlSet) {
      i++
      let status = 'unknown'
      try {
        status = (await verifyImageUrl(url)) ? 'OK' : 'BROKEN'
      } catch {
        status = 'ERR'
      }
      if (status === 'OK') ok++
      else {
        broken++
        brokenList.push({ url, owner, status })
        console.log(`  [${status}] ${owner} -> ${url}`)
      }
      if (i % 40 === 0) console.log(`  ... ${i}/${urlSet.size} checked (${ok} ok, ${broken} broken so far)`)
    }
    console.log(`\nverification done: ${ok} OK, ${broken} broken/errored of ${urlSet.size}`)

    // Products whose stored images explicitly look wrong.
    console.log('\n================ PRODUCT image issues ================')
    let phProducts = 0
    let emptyProducts = 0
    for (const p of activeProducts) {
      const imgs = Array.isArray(p.images) ? p.images : []
      if (imgs.length === 0) { emptyProducts++; console.log(`  [NO IMAGES] ${p.slug}`) }
      else if (PLACEHOLDER.test(String(imgs[0] || ''))) { phProducts++; console.log(`  [PLACEHOLDER] ${p.slug}: ${imgs[0]}`) }
    }
    console.log(`active products with empty images: ${emptyProducts}, placeholder: ${phProducts}`)

    // Products whose catalog model image differs from product images[0].
    console.log('\n--- catalog model image vs product primary image (drift) ---')
    let drift = 0
    for (const c of activeCat) {
      const prodSlug = catSlugByProduct.get(c.slug)
      if (!prodSlug) continue
      const prod = activeProducts.find(p => p.slug === prodSlug)
      if (!prod) continue
      const prodImg = (Array.isArray(prod.images) && prod.images.find(Boolean)) || ''
      if (c.image && prodImg !== c.image) {
        drift++
        console.log(`  ${c.slug}: catalog=${c.image} | product=${prodImg || '(none)'}`)
      }
    }
    console.log(`drift count: ${drift}`)
  } catch (e) {
    console.error('Audit failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

main()