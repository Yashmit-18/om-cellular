// Run: node scripts/fixCatalogImages.js            (dry-run: prints the plan)
//      node scripts/fixCatalogImages.js --apply     (writes the fixes)
//
// Repair pass for live catalog images:
//  - Re-verifies every stored catalog image with the hardened verifier, which
//    rejects HTTP-200-with-empty-body assets and HTML error pages.
//  - Replaces known wrong-model assets (the stored photo is a different phone)
//    with hand-verified replacements for that exact model.
//  - Re-resolves broken/missing assets through GSMArena candidate URLs and the
//    search fallback (fixed to pick the best-scoring result, not the first hit).
//  - Propagates each catalog fix to the matching product and its variants so the
//    storefront reflects the change without needing a full re-seed.
//
// SAFETY:
//  - Reads only unless --apply is passed.
//  - --apply touches ONLY the image fields (catalog `image`, product/images[],
//    variant images[]); it never deletes documents or changes any other field.
//  - Idempotent: re-running is a no-op once fixed.
//
// Requires MONGODB_URI env var (loaded from server/.env automatically).

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })
require('dns').setServers(['8.8.8.8', '1.1.1.1'])

const { MongoClient } = require('mongodb')
const { verifyImageUrl, resolveImageUrl, slugify } = require('./lib/catalogImages')

const APPLY = process.argv.includes('--apply')
const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('ERROR: MONGODB_URI environment variable is required')
  process.exit(1)
}

// Hand-verified GSMArena bigpic replacements for catalog entries whose stored
// image is either the wrong phone or known-broken. Keys are catalog slugs
// (the model.slug value, e.g. `redmi-redmi-12`). Each URL is re-verified at
// runtime before it can be applied.
const KNOWN_REPLACEMENTS = {
  'redmi-redmi-12': { url: 'https://fdn2.gsmarena.com/vv/bigpic/xiaomi-redmi-12.jpg', reason: 'stored image is the Xiaomi 12 photo (wrong model)' },
  'oneplus-oneplus-nord-ce4-lite': { url: 'https://fdn2.gsmarena.com/vv/bigpic/oneplus-nord-ce4-lite-.jpg', reason: 'stored image serves a 0-byte file (broken)' },
}

async function run(db, { log = console.log } = {}) {
  const catalog = db.collection('phonecatalogmodels')
  const products = db.collection('products')
  const variants = db.collection('productvariants')

  const models = await catalog.find({ isActive: true }).toArray()
  log(`Catalog models: ${models.length}`)

  const fixes = []

  for (const model of models) {
    const slug = model.slug || slugify(`${model.brandName} ${model.modelName}`)
    const existing = model.image || ''
    const known = KNOWN_REPLACEMENTS[slug]

    let planned = null
    let reason = ''

    if (known) {
      const replacement = (await verifyImageUrl(known.url))
        ? known.url
        : await resolveImageUrl(model.brandName, model.modelName)
      planned = replacement === existing ? null : replacement
      reason = known.reason
    } else if (existing && !(await verifyImageUrl(existing))) {
      const replacement = await resolveImageUrl(model.brandName, model.modelName)
      planned = replacement === existing ? null : replacement
      reason = 'stored image no longer serves real image data'
    }

    if (!planned) continue
    fixes.push({ slug, brand: model.brandName, model: model.modelName, from: existing || '(none)', to: planned, reason })
  }

  log(`\nPlanned image fixes: ${fixes.length}`)
  for (const f of fixes) {
    log(`  ${f.slug} (${f.brand} ${f.model}): ${f.reason}`)
    log(`      from ${f.from}`)
    log(`      to   ${f.to}`)
  }

  if (fixes.length === 0) {
    log('\nNo fixes needed. All stored catalog images verified OK.')
    return { planned: 0, applied: 0 }
  }

  if (!APPLY) {
    log('\nDRY-RUN — nothing was written. Re-run with --apply to apply these fixes.')
    return { planned: fixes.length, applied: 0 }
  }

  let applied = 0
  for (const f of fixes) {
    await catalog.updateOne({ slug: f.slug }, { $set: { image: f.to, updatedAt: new Date() } })

    const product = await products.findOne({
      $or: [{ slug: f.slug }, { catalogModelSlug: f.slug }],
    })
    if (product) {
      const nextImages = [f.to, ...(product.images || []).filter(u => u !== f.from && u !== f.to)]
      await products.updateOne({ _id: product._id }, { $set: { images: nextImages, updatedAt: new Date() } })
      const vAll = await variants.find({ productId: product._id }).toArray()
      for (const v of vAll) {
        const vImages = Array.isArray(v.images) && v.images.length ? v.images : []
        if (vImages.includes(f.from) || vImages.length === 0) {
          await variants.updateOne({ _id: v._id }, { $set: { images: [f.to, ...vImages.filter(u => u !== f.from && u !== f.to)] } })
        }
      }
    }
    applied++
    log(`  APPLIED ${f.slug}: ${f.from} -> ${f.to}`)
  }

  log(`\nApplied ${applied}/${fixes.length} image fix(es).`)
  return { planned: fixes.length, applied }
}

async function main() {
  const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 15000 })
  try {
    await client.connect()
    const db = client.db()
    await run(db)
  } catch (e) {
    console.error('Fix failed:', e.message)
    process.exit(1)
  } finally {
    await client.close()
  }
}

module.exports = { run }

if (require.main === module) {
  main()
}