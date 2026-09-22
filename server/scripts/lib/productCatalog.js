// Builds the premium buy-phones product catalog from phonecatalogmodels.
// Idempotent production-safe sync:
//  - Upserts products keyed on their catalog slug.
//  - Creates variants keyed on SKU (storage × color), fills missing images/specs.
//  - Never deleteMany; never touches products that do not map to a catalog model
//    (admin-custom products are left alone).
//  - Reactivates inactive catalog-mapped products.

const { computeModelBase, storageAdjust } = require('./pricing')
const { retailInfo } = require('./retailPricing')
const {
  chipsetFor, osFor, networkFor, displayFor, cameraFor, batteryFor, tierOf,
  colorsFor, whatsIncluded, buildDescription,
} = require('../data/catalogProfiles')

function slugify(text) {
  return String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function hash(n) {
  let h = 0
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) >>> 0
  return h
}

function productName(brand, model) {
  const bn = norm(brand)
  const mn = norm(model)
  // Brand-prefixed unless the model name already carries the brand word.
  return mn.startsWith(bn) ? model : `${brand} ${model}`.trim()
}

function tierKeywords(model) {
  const m = norm(model)
  if (/s24|s23|iphone 1[1-6]|oneplus 12$|oneplus 13|pixel (8|9)|phone 2$|x100|x200|gt 6|find x8|14 ultra|edge 50 pro|edge 50 ultra|rog|fold|flip|iqoo 13/.test(m)) return true
  return false
}

const NEW_ARRIVAL_RE = /iphone (15|16)|s24|oneplus (12|13)$|pixel (8|9)|redmi note 13|x200|x100|reno 12|find x8|edge 50|iqoo (12|13)$|phone 2a|pova 5|camon 30|honor 200|gt 6|13 pro\+?|v40$|z9$/
const BEST_SELLER_RE = /iphone (12|13|14)|galaxy (a1|a3|a5|m3|f3|s21|s22|s23)|redmi (note|13|12)|moto g|poco (x6|f6|m6|c65)|realme (c|12 5g|13)|vivo (y28|y27|t3)|pixel 8a|nokia g42|cmf phone 1|oneplus nord ce4|lava blaze curve/

function isCatalogProduct(brand, model) {
  // Xiaomi-brand Redmi entries are covered by the Redmi brand (no duplicates).
  if (norm(brand) === 'xiaomi' && /^redmi/.test(norm(model))) return false
  return true
}

function buildVariantDoc(model, brand, color, storageVariants) {
  const storage = storageVariants.storage
  const ram = storageVariants.ram || '8GB'
  const colorKey = slugify(color)
  const sku = `OMC-${slugify(brand)}-${slugify(model)}-${slugify(storage)}-${slugify(ram)}-${colorKey}`
  const retail = retailInfo(brand, model, storage, null)
  const tier = tierOf(model)
  const chip = chipsetFor(brand, model)
  const specs = [
    { key: 'Display', value: displayFor(model, tier) },
    { key: 'Processor', value: chip },
    { key: 'RAM', value: ram },
    { key: 'Internal Storage', value: storage },
    { key: 'Main Camera', value: cameraFor(brand, model, tier) },
    { key: 'Battery', value: batteryFor(model, tier) },
    { key: 'Operating System', value: osFor(brand, model) },
    { key: 'Network', value: networkFor(model, tier) },
    { key: 'Warranty', value: '1 Year OM Cellular Warranty' },
  ]
  return {
    name: `${model} ${storage} ${color}`,
    sku,
    price: retail.price,
    discountPrice: retail.discountPrice,
    ram,
    storage,
    color,
    condition: 'Refurbished',
    isRefurbished: true,
    specifications: specs,
    whatsIncluded: whatsIncluded(),
    badge: /ultra|pro max|rog|fold/.test(norm(model)) ? 'Premium' : undefined,
  }
}

// The spec key used for a variant's size/storage label, per category. Non-phone
// categories use an explicit label (e.g. "256GB" for tablets, "44mm" for watches).
function labelKeyFor(categorySlug) {
  if (categorySlug === 'tablets') return 'Storage'
  if (categorySlug === 'smartwatches') return 'Size'
  return ''
}

// Variant builder for the expansion catalog (tablets / smartwatches / accessories).
// Uses only the explicit, real data stored on the catalog model document so no
// smartphone heuristics leak into non-phone specs or pricing.
function buildExpansionVariantDoc(model, categorySlug, color, labelDef) {
  const label = labelDef.label || ''
  const specs = Array.isArray(model.specs) ? model.specs.map(s => ({ ...s })) : []
  const lk = labelKeyFor(categorySlug)
  if (lk && label) specs.push({ key: lk, value: label })

  const name = [model.modelName, label, color].filter(Boolean).join(' ')
  const sku = ['OMC', model.slug, label ? slugify(label) : 'std', slugify(color)].join('-')
  const condition = model.condition || 'Refurbished'

  return {
    name,
    sku,
    price: Number(labelDef.price) || 0,
    discountPrice: Number(labelDef.discountPrice) || 0,
    ram: labelDef.ram || '',
    storage: categorySlug === 'tablets' ? label : '',
    color,
    condition,
    isRefurbished: condition !== 'New',
    specifications: specs,
    whatsIncluded: Array.isArray(model.whatsIncluded) ? model.whatsIncluded : [],
    badge: model.isFeatured ? 'Premium' : undefined,
  }
}

async function buildProducts(db, { log = () => {} } = {}) {
  const catalog = db.collection('phonecatalogmodels')
  const products = db.collection('products')
  const variants = db.collection('productvariants')
  const brands = db.collection('brands')
  const categories = db.collection('categories')

  const categoryIdCache = {}
  async function categoryIdFor(slug) {
    const key = slug || 'smartphones'
    if (!(key in categoryIdCache)) {
      const cat = await categories.findOne({ slug: key })
      categoryIdCache[key] = cat ? cat._id : null
    }
    return categoryIdCache[key]
  }

  const models = await catalog.find({ isActive: true }).sort({ brandName: 1, sortOrder: 1, modelName: 1 }).toArray()

  let created = 0
  let updated = 0
  let skippedNoImage = 0
  let skippedCustom = 0
  let variantsCreated = 0
  let variantsUpdated = 0
  let processed = 0
  const liveSlugs = new Set()
  const seenNames = new Map()

  for (const model of models) {
    if (!isCatalogProduct(model.brandName, model.modelName)) { skippedCustom++; continue }

    if (processed % 25 === 0 && processed > 0) log(`Processed ${processed}/${models.length} catalog models...`)
    processed++

    const categorySlug = model.categorySlug || 'smartphones'
    const isExpansion = categorySlug !== 'smartphones'
    const image = model.image || ''
    // Smartphones require a verified image; expansion devices (tablets, watches,
    // accessories) may intentionally ship without one.
    if (!image && !isExpansion) { skippedNoImage++; continue }

    const brand = await brands.findOne({ slug: slugify(model.brandName) })
    const brandId = brand ? brand._id : null
    const categoryId = await categoryIdFor(categorySlug)
    const name = productName(model.brandName, model.modelName)
    const mL = norm(model.modelName)

    // Canonical slug from the display name (brand-prefixed once). Duplicate
    // entries for the same device (e.g. "GT 6 Pro" / "Realme GT 6 Pro")
    // collapse onto one product. Expansion entries keep their explicit slug so
    // devices whose names collide once slugified (e.g. "Tab S9" / "Tab S9+")
    // stay distinct.
    let slug
    if (isExpansion) {
      slug = model.slug
    } else {
      slug = seenNames.get(name) || ''
      if (!slug) {
        slug = slugify(name)
        seenNames.set(name, slug)
      }
    }

    let description = model.description
    if (!description) {
      const chip = chipsetFor(model.brandName, model.modelName)
      const display = displayFor(model.modelName, tierOf(model.modelName))
      description = buildDescription(model.brandName, model.modelName, chip, display)
    }

    const existingProduct = await products.findOne({ slug })

    const flags = isExpansion
      ? {
          isFeatured: !!model.isFeatured,
          isNewArrival: !!model.isNewArrival,
          isBestSeller: !!model.isBestSeller,
        }
      : {
          isFeatured: tierKeywords(model.modelName) || /pro|ultra|fold|flip|max/.test(mL),
          isNewArrival: NEW_ARRIVAL_RE.test(mL),
          isBestSeller: BEST_SELLER_RE.test(mL),
        }
    if (existingProduct) {
      // Preserve merchant-set flags after first sync.
      flags.isFeatured = existingProduct.isFeatured ?? flags.isFeatured
      flags.isNewArrival = existingProduct.isNewArrival ?? flags.isNewArrival
      flags.isBestSeller = existingProduct.isBestSeller ?? flags.isBestSeller
    }
    const productUpdate = {
      name,
      description,
      brandId,
      categoryId,
      catalogModelSlug: model.slug,
      images: image ? [image] : [],
      isFeatured: flags.isFeatured,
      isNewArrival: flags.isNewArrival,
      isBestSeller: flags.isBestSeller,
      isRefurbished: (model.condition || 'Refurbished') !== 'New',
      condition: model.condition || 'Refurbished',
      warranty: (model.condition || 'Refurbished') === 'New'
        ? '1 Year Brand Warranty'
        : '1 Year OM Cellular Warranty',
      returnPolicy: existingProduct && existingProduct.returnPolicy
        ? existingProduct.returnPolicy
        : '7-day replacement for manufacturing defects',
      seoTitle: `${name} - Buy Online at OM Cellular`,
      seoDescription: description.slice(0, 150),
      seoKeywords: `${model.brandName} ${model.modelName} buy online kota`.toLowerCase(),
      // Ratings are maintained only from approved customer reviews.
      rating: 0,
      ratingCount: 0,
      isActive: true,
      updatedAt: new Date(),
    }
    if (!existingProduct) productUpdate.createdAt = new Date()

    const upsertResult = await products.updateOne({ slug }, { $set: productUpdate }, { upsert: true })
    if (upsertResult.upsertedCount > 0) created++
    else updated++
    liveSlugs.add(slug)

    const productDoc = await products.findOne({ slug })
    const productId = productDoc._id

    const variantsToBuild = isExpansion
      ? (Array.isArray(model.labels) ? model.labels : [])
      : (Array.isArray(model.storageVariants) && model.storageVariants.length > 0
          ? model.storageVariants
          : [{ storage: '128GB', ram: '8GB' }])

    const colors = isExpansion
      ? (Array.isArray(model.colors) && model.colors.length > 0 ? model.colors : ['Standard'])
      : colorsFor(model.brandName).slice(0, 2)

    for (const sv of variantsToBuild) {
      for (const color of colors) {
        const v = isExpansion
          ? buildExpansionVariantDoc(model, categorySlug, color, sv)
          : buildVariantDoc(model.modelName, model.brandName, color, sv)
        const existingV = await variants.findOne({ sku: v.sku })
        if (existingV) {
          const setV = {
            productId,
            name: v.name,
            price: v.price,
            discountPrice: v.discountPrice,
            ram: v.ram,
            storage: v.storage,
            color: v.color,
            condition: v.condition,
            isRefurbished: v.isRefurbished,
            specifications: v.specifications,
            whatsIncluded: v.whatsIncluded,
            badge: v.badge,
            isActive: true,
            updatedAt: new Date(),
          }
          if (image && (!existingV.images || !Array.isArray(existingV.images) || existingV.images.length === 0 || /placehold\.co|\/placeholder/.test((existingV.images[0] || '')))) {
            setV.images = [image]
          }
          if (!existingV.stock || existingV.stock === 0) setV.stock = 5 + (hash(v.sku) % 18)
          await variants.updateOne({ sku: v.sku }, { $set: setV })
          variantsUpdated++
        } else {
          await variants.insertOne({
            productId,
            name: v.name,
            sku: v.sku,
            price: v.price,
            discountPrice: v.discountPrice,
            stock: 5 + (hash(v.sku) % 18),
            reservedStock: 0,
            soldCount: 0,
            ram: v.ram,
            storage: v.storage,
            color: v.color,
            condition: v.condition,
            images: image ? [image] : [],
            specifications: v.specifications,
            whatsIncluded: v.whatsIncluded,
            isRefurbished: v.isRefurbished,
            featured: true,
            badge: v.badge,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          variantsCreated++
        }
      }
    }

    // Fill product images if they (or their variants) came from our old placeholder seed.
    const current = await products.findOne({ slug })
    const needsImage = !current.images || current.images.length === 0 || /placehold\.co|\/placeholder/.test((current.images[0] || ''))
    if (image && needsImage) {
      await products.updateOne({ _id: productId }, { $set: { images: [image], updatedAt: new Date() } })
    }
  }

  // Purge any remaining placeholder images (legacy seed data). Every product +
  // variant that still shows a placeholder either gets the matched catalog
  // model's real image or is deactivated so no placeholder ever reaches the UI.
  const placeholder = /placehold\.co|\/placeholder/
  const phProducts = await products.find({ images: { $elemMatch: { $regex: placeholder } } }).toArray()
  for (const p of phProducts) {
    const model = await catalog.findOne({
      isActive: true,
      $or: [ { slug: p.slug }, { modelName: { $regex: `^${p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } } ],
    })
    if (model && model.image) {
      await products.updateOne({ _id: p._id }, { $set: { images: [model.image], updatedAt: new Date() } })
      await variants.updateMany(
        { productId: p._id, $or: [{ images: { $exists: false } }, { images: { $size: 0 } }, { images: { $elemMatch: { $regex: placeholder } } }] },
        { $set: { images: [model.image] } }
      )
    } else {
      await products.updateOne({ _id: p._id }, { $set: { isActive: false, updatedAt: new Date() } })
    }
  }
  if (phProducts.length) log(`Cleaned ${phProducts.length} legacy placeholder product(s)`)

  const liveArr = [...liveSlugs]
  const superseded = await products.updateMany(
    { isActive: true, catalogModelSlug: { $exists: true }, slug: { $nin: liveArr } },
    { $set: { isActive: false, updatedAt: new Date() } }
  )
  if (superseded.modifiedCount) log(`Deactivated ${superseded.modifiedCount} superseded catalog product(s)`)

  // Hide old non-canonical (pre-catalog) seed variants on catalog-owned products.
  const catProductIds = (await products.find({ catalogModelSlug: { $exists: true } }).project({ _id: 1 }).toArray()).map(p => p._id)
  if (catProductIds.length) {
    const oldVariants = await variants.updateMany(
      { productId: { $in: catProductIds }, sku: { $not: /^OMC-/ } },
      { $set: { isActive: false } }
    )
    if (oldVariants.modifiedCount) log(`Deactivated ${oldVariants.modifiedCount} legacy seed variant(s)`)

    // Also retire variants stranded on superseded catalog products so nothing
    // user-visible hangs off an inactive product.
    const deadCatIds = (await products.find({ isActive: false, catalogModelSlug: { $exists: true }, slug: { $nin: liveArr } }).project({ _id: 1 }).toArray()).map(p => p._id)
    const orphaned = await variants.updateMany(
      { productId: { $in: deadCatIds }, isActive: true },
      { $set: { isActive: false } }
    )
    if (orphaned.modifiedCount) log(`Deactivated ${orphaned.modifiedCount} orphaned variant(s)`)
  }

  // Seed artifacts superseded by their canonical sibling (same device, other brand).
  const SUPERSEDED_LEGACY = ['xiaomi-redmi-note-13-pro-5g', 'realme-gt-6-pro']
  for (const s of SUPERSEDED_LEGACY) {
    const p = await products.findOne({ slug: s })
    if (p) {
      await products.updateOne({ _id: p._id }, { $set: { isActive: false, updatedAt: new Date() } })
      await variants.updateMany({ productId: p._id, isActive: true }, { $set: { isActive: false } })
      log(`Superseded legacy seed product: ${s}`)
    }
  }

  log(`Catalog products: ${created} created, ${updated} updated, ${skippedCustom} skipped (custom/non-catalog), ${skippedNoImage} skipped (no image)`)
  log(`Variants: ${variantsCreated} created, ${variantsUpdated} updated`)

  return { productsCreated: created, productsUpdated: updated, variantsCreated, variantsUpdated }
}

async function syncValuationRules(db, { log = () => {} } = {}) {
  const catalog = db.collection('phonecatalogmodels')
  const valuations = db.collection('phonevaluations')
  const defaults = {
    conditionMultiplier: { NEW: 1, LIKE_NEW: 0.92, EXCELLENT: 0.88, GOOD: 0.78, FAIR: 0.62, POOR: 0.45 },
    ageDepreciationPct: { less_than_3_months: 0, '3_to_6_months': 0.05, '6_to_12_months': 0.1, '1_to_2_years': 0.18, more_than_2_years: 0.3 },
    displayDeduction: 5000,
    batteryDeduction: 1200,
    bodyDeduction: 1800,
    cameraDeduction: 900,
    accessoryDeduction: 500,
    billDeduction: 0,
    boxDeduction: 300,
  }

  // Valuation rules model phone trade-ins only; skip tablets/watches/accessories.
  const models = await catalog.find({
    isActive: true,
    $or: [{ categorySlug: { $exists: false } }, { categorySlug: 'smartphones' }],
  }).toArray()
  let created = 0
  let reactivated = 0
  for (const model of models) {
    const baseValue = computeModelBase(model.brandName, model.modelName)
    const storageAdjustment = {}
    if (Array.isArray(model.storageVariants)) {
      for (const sv of model.storageVariants) storageAdjustment[sv.storage] = storageAdjust(sv.storage)
    }
    const ageDepreciation = {}
    for (const [k, pct] of Object.entries(defaults.ageDepreciationPct)) {
      ageDepreciation[k] = Math.round(baseValue * pct)
    }
    const existing = await valuations.findOne({ brand: model.brandName, model: model.modelName })
    if (!existing) {
      await valuations.insertOne({
        brand: model.brandName,
        model: model.modelName,
        baseValue,
        storageAdjustment,
        ramAdjustment: {},
        ageDepreciation,
        conditionMultiplier: defaults.conditionMultiplier,
        displayDeduction: defaults.displayDeduction,
        batteryDeduction: defaults.batteryDeduction,
        bodyDeduction: defaults.bodyDeduction,
        cameraDeduction: defaults.cameraDeduction,
        accessoryDeduction: defaults.accessoryDeduction,
        billDeduction: defaults.billDeduction,
        boxDeduction: defaults.boxDeduction,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      created++
    } else if (!existing.isActive) {
      await valuations.updateOne({ _id: existing._id }, { $set: { isActive: true, updatedAt: new Date() } })
      reactivated++
    }
  }
  log(`PhoneValuation rules: ${created} created, ${reactivated} reactivated`)
  return { created, reactivated }
}

module.exports = {
  buildProducts,
  syncValuationRules,
  productName,
  isCatalogProduct,
  labelKeyFor,
  buildExpansionVariantDoc,
}