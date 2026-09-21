import { test } from 'node:test'
import assert from 'node:assert/strict'

import expansion from '../scripts/data/catalogExpansion.json'
import {
  labelKeyFor,
  buildExpansionVariantDoc,
  productName,
} from '../scripts/lib/productCatalog'

type Label = { label: string; ram?: string; price: number; discountPrice: number }
type ExpansionItem = {
  brandName: string
  modelName: string
  slug: string
  categorySlug: string
  image: string
  condition: string
  description: string
  specs: Array<{ key: string; value: string }>
  colors: string[]
  whatsIncluded: string[]
  labels: Label[]
}

const ALL = expansion as ExpansionItem[]
const byCategory = (slug: string) => ALL.filter(m => m.categorySlug === slug)

const VALID_CATEGORIES = new Set(['tablets', 'smartwatches', 'accessories'])
const PLACEHOLDER = /placehold\.co|\/placeholder|example\.com|lorem/i

test('expansion catalog has the expected real-device volume per category', () => {
  assert.ok(ALL.length >= 35, `expected at least 35 devices, got ${ALL.length}`)
  assert.ok(byCategory('tablets').length >= 12, 'expected at least 12 tablets')
  assert.ok(byCategory('smartwatches').length >= 10, 'expected at least 10 smartwatches')
  assert.ok(byCategory('accessories').length >= 15, 'expected at least 15 accessories')
})

test('every expansion device carries complete real metadata', () => {
  for (const m of ALL) {
    assert.ok(m.brandName && m.modelName, `missing name for ${m.slug}`)
    assert.ok(m.slug && /^[a-z0-9-]+$/.test(m.slug), `bad slug: ${m.slug}`)
    assert.ok(VALID_CATEGORIES.has(m.categorySlug), `bad category: ${m.categorySlug}`)
    assert.ok(typeof m.description === 'string' && m.description.length > 30, `weak description: ${m.slug}`)
    assert.ok(['New', 'Refurbished'].includes(m.condition), `bad condition: ${m.slug}`)
    assert.ok(Array.isArray(m.specs) && m.specs.length >= 4, `too few specs: ${m.slug}`)
    for (const s of m.specs) {
      assert.ok(s.key && s.value && !PLACEHOLDER.test(s.value), `bad spec on ${m.slug}: ${JSON.stringify(s)}`)
    }
    assert.ok(Array.isArray(m.colors) && m.colors.length >= 1, `no colors: ${m.slug}`)
    assert.ok(Array.isArray(m.whatsIncluded) && m.whatsIncluded.length >= 1, `no box contents: ${m.slug}`)
    assert.ok(Array.isArray(m.labels) && m.labels.length >= 1, `no variants: ${m.slug}`)
  }
})

test('slugs and device identities are unique', () => {
  const slugs = ALL.map(m => m.slug)
  assert.equal(new Set(slugs).size, slugs.length, 'duplicate slugs')
  const identities = ALL.map(m => `${m.brandName} ${m.modelName}`.toLowerCase())
  assert.equal(new Set(identities).size, identities.length, 'duplicate devices')
})

test('every variant is priced sensibly (MRP > selling price > 0)', () => {
  for (const m of ALL) {
    for (const l of m.labels) {
      assert.ok(Number.isInteger(l.price) && l.price > 0, `bad price on ${m.slug}`)
      assert.ok(Number.isInteger(l.discountPrice) && l.discountPrice > 0, `bad discountPrice on ${m.slug}`)
      assert.ok(l.discountPrice < l.price, `discount must be below MRP on ${m.slug} (${l.label})`)
    }
  }
})

test('categories carry honest condition + image expectations', () => {
  for (const m of byCategory('tablets')) {
    assert.equal(m.condition, 'Refurbished', `tablet should be refurbished: ${m.slug}`)
    assert.ok(m.image.startsWith('https://'), `tablet needs an image: ${m.slug}`)
  }
  for (const m of byCategory('smartwatches')) {
    assert.equal(m.condition, 'Refurbished', `watch should be refurbished: ${m.slug}`)
    assert.ok(m.image.startsWith('https://'), `watch needs an image: ${m.slug}`)
  }
  for (const m of byCategory('accessories')) {
    assert.equal(m.condition, 'New', `accessory should be new: ${m.slug}`)
    // GSMArena has no verified accessory images — these intentionally ship
    // image-less and render a category-aware icon fallback.
    assert.equal(m.image, '', `accessory should not use an unverified image: ${m.slug}`)
  }
})

test('image URLs are real, verified hosts (no placeholders)', () => {
  for (const m of ALL) {
    if (!m.image) continue
    assert.ok(!PLACEHOLDER.test(m.image), `placeholder image on ${m.slug}`)
    assert.ok(/^https:\/\/fdn2\.gsmarena\.com\/vv\/bigpic\//.test(m.image), `unexpected image host on ${m.slug}: ${m.image}`)
  }
})

test('labelKeyFor maps sizes/storage per category', () => {
  assert.equal(labelKeyFor('tablets'), 'Storage')
  assert.equal(labelKeyFor('smartwatches'), 'Size')
  assert.equal(labelKeyFor('accessories'), '')
  assert.equal(labelKeyFor('smartphones'), '')
})

test('generated variant SKUs are unique across the whole expansion', () => {
  const skus = new Set<string>()
  for (const m of ALL) {
    for (const l of m.labels) {
      for (const color of m.colors) {
        const v = buildExpansionVariantDoc(m as any, m.categorySlug, color, l)
        assert.ok(v.name.length > 0, `empty variant name for ${m.slug}`)
        assert.ok(!skus.has(v.sku), `duplicate SKU ${v.sku}`)
        skus.add(v.sku)
      }
    }
  }
  assert.ok(skus.size >= 60, `expected a meaningful SKU count, got ${skus.size}`)
})

test('generated variants carry the right spec label and pricing', () => {
  const tablet = byCategory('tablets')[0]
  const tv = buildExpansionVariantDoc(tablet as any, 'tablets', tablet.colors[0], tablet.labels[0])
  assert.equal(tv.storage, tablet.labels[0].label)
  assert.equal(tv.price, tablet.labels[0].price)
  assert.equal(tv.condition, 'Refurbished')
  assert.equal(tv.isRefurbished, true)
  assert.ok(tv.specifications.some(s => s.key === 'Storage' && s.value === tablet.labels[0].label))

  const accessory = byCategory('accessories')[0]
  const av = buildExpansionVariantDoc(accessory as any, 'accessories', accessory.colors[0], accessory.labels[0])
  assert.equal(av.storage, '')
  assert.equal(av.condition, 'New')
  assert.equal(av.isRefurbished, false)

  const watch = byCategory('smartwatches')[0]
  const wv = buildExpansionVariantDoc(watch as any, 'smartwatches', watch.colors[0], watch.labels[0])
  assert.ok(wv.specifications.some(s => s.key === 'Size' && s.value === watch.labels[0].label))
})

test('productName prefixes the brand exactly once', () => {
  assert.equal(productName('Apple', 'iPad Air (2022)'), 'Apple iPad Air (2022)')
  assert.equal(productName('Samsung', 'Galaxy Tab S9+'), 'Samsung Galaxy Tab S9+')
})
