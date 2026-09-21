import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  parseProductQuery,
  buildProductMatch,
  buildVariantAttrCondition,
  buildPostLookupMatch,
  buildSortDoc,
  parseMultiParam,
  parseNumberParam,
  isTruthyParam,
  normalizeSearchTerm,
  cleanStringValues,
  sortStorageValues,
  storageRank,
  MAX_PRICE,
} from '../src/services/productFilter.service'

const BRAND_A = '507f1f77bcf86cd799439011'
const BRAND_B = '507f1f77bcf86cd799439012'
const CAT_A = '507f1f77bcf86cd799439021'

test('defaults: page 1, limit 20, no filters, newest sort', () => {
  const p = parseProductQuery({})
  assert.equal(p.page, 1)
  assert.equal(p.limit, 20)
  assert.equal(p.search, '')
  assert.deepEqual(p.brandIds, [])
  assert.deepEqual(p.categoryIds, [])
  assert.deepEqual(p.conditions, [])
  assert.deepEqual(p.storages, [])
  assert.deepEqual(p.rams, [])
  assert.deepEqual(p.colors, [])
  assert.equal(p.minPrice, null)
  assert.equal(p.maxPrice, null)
  assert.equal(p.inStock, false)
  assert.equal(p.discount, false)
  assert.equal(p.includeInactive, false)
  assert.equal(p.sort, 'newest')
  assert.equal(p.invalidBrand, false)
  assert.equal(p.invalidCategory, false)
})

test('pagination is clamped to sane bounds', () => {
  assert.equal(parseProductQuery({ page: '3', limit: '12' }).page, 3)
  assert.equal(parseProductQuery({ page: '0' }).page, 1)
  assert.equal(parseProductQuery({ page: '-4' }).page, 1)
  assert.equal(parseProductQuery({ page: 'abc' }).page, 1)
  assert.equal(parseProductQuery({ limit: '0' }).limit, 1)
  assert.equal(parseProductQuery({ limit: '999' }).limit, 100)
  assert.equal(parseProductQuery({ limit: 'nope' }).limit, 20)
})

test('single and multi brandId/categoryId are accepted', () => {
  const single = parseProductQuery({ brandId: BRAND_A, categoryId: CAT_A })
  assert.deepEqual(single.brandIds, [BRAND_A])
  assert.deepEqual(single.categoryIds, [CAT_A])
  assert.equal(single.invalidBrand, false)

  const multi = parseProductQuery({ brandId: `${BRAND_A}, ${BRAND_B}`, category: `${CAT_A}` })
  assert.deepEqual(multi.brandIds, [BRAND_A, BRAND_B])
  assert.deepEqual(multi.categoryIds, [CAT_A])

  assert.deepEqual(parseMultiParam('a, b ,, a ,c'), ['a', 'b', 'c'])
  assert.deepEqual(parseMultiParam(['x', 'x', ' y ']), ['x', 'y'])
  assert.deepEqual(parseMultiParam(undefined), [])
})

test('malformed brand/category tokens flag invalid without dropping valid ones', () => {
  const bad = parseProductQuery({ brandId: 'not-an-id' })
  assert.equal(bad.invalidBrand, true)
  assert.deepEqual(bad.brandIds, [])

  const mixed = parseProductQuery({ brandId: `${BRAND_A},nope` })
  assert.equal(mixed.invalidBrand, true)
  assert.deepEqual(mixed.brandIds, [BRAND_A])

  const badCat = parseProductQuery({ categoryId: '123' })
  assert.equal(badCat.invalidCategory, true)
})

test('price bounds parse, swap when reversed, and clamp to safe range', () => {
  const both = parseProductQuery({ minPrice: '1000', maxPrice: '5000' })
  assert.equal(both.minPrice, 1000)
  assert.equal(both.maxPrice, 5000)

  const reversed = parseProductQuery({ minPrice: '5000', maxPrice: '1000' })
  assert.equal(reversed.minPrice, 1000)
  assert.equal(reversed.maxPrice, 5000)

  const negative = parseProductQuery({ minPrice: '-50' })
  assert.equal(negative.minPrice, 0)

  const huge = parseProductQuery({ maxPrice: String(MAX_PRICE + 10_000_000) })
  assert.equal(huge.maxPrice, MAX_PRICE)

  assert.equal(parseProductQuery({ minPrice: 'abc' }).minPrice, null)
  assert.equal(parseProductQuery({ maxPrice: '' }).maxPrice, null)
  assert.equal(parseNumberParam('12.5', { min: 0 }), 12.5)
  assert.equal(parseNumberParam('Infinity'), null)
})

test('multi-value condition/storage/ram/color are parsed', () => {
  const p = parseProductQuery({
    condition: 'EXCELLENT,GOOD',
    storage: '128GB,256GB',
    ram: '6GB, 8GB',
    color: 'Black,Blue',
  })
  assert.deepEqual(p.conditions, ['EXCELLENT', 'GOOD'])
  assert.deepEqual(p.storages, ['128GB', '256GB'])
  assert.deepEqual(p.rams, ['6GB', '8GB'])
  assert.deepEqual(p.colors, ['Black', 'Blue'])
})

test('boolean flags accept true/1 and sort is whitelisted', () => {
  const p = parseProductQuery({ inStock: 'true', discount: '1', isFeatured: 'true', isRefurbished: true, isNewArrival: 'true', isBestSeller: 'true' })
  assert.equal(p.inStock, true)
  assert.equal(p.discount, true)
  assert.equal(p.isFeatured, true)
  assert.equal(p.isRefurbished, true)
  assert.equal(p.isNewArrival, true)
  assert.equal(p.isBestSeller, true)

  assert.equal(isTruthyParam('false'), false)
  assert.equal(isTruthyParam('yes'), false)

  assert.equal(parseProductQuery({ sort: 'price_desc' }).sort, 'price_desc')
  assert.equal(parseProductQuery({ sort: 'discount' }).sort, 'discount')
  assert.equal(parseProductQuery({ sort: 'rating' }).sort, 'rating')
  assert.equal(parseProductQuery({ sort: 'DROP TABLE' }).sort, 'newest')
  assert.equal(parseProductQuery({ sort: '' }).sort, 'newest')
})

test('includeInactive is only honoured for admins', () => {
  assert.equal(parseProductQuery({ includeAll: 'true' }, { isAdmin: true }).includeInactive, true)
  assert.equal(parseProductQuery({ includeAll: 'true' }, { isAdmin: false }).includeInactive, false)
  assert.equal(parseProductQuery({ includeAll: 'true' }).includeInactive, false)
})

test('search term is trimmed, whitespace-collapsed and regex-escaped', () => {
  assert.equal(normalizeSearchTerm('  iphone   13  '), 'iphone 13')
  assert.equal(normalizeSearchTerm('a+b(c)'), 'a\\+b\\(c\\)')
  assert.equal(parseProductQuery({ query: '  iPhone  ' }).search, 'iPhone')
  assert.equal(parseProductQuery({ search: 'pixel' }).search, 'pixel')
})

test('buildProductMatch mirrors parsed filters', () => {
  const p = parseProductQuery({
    brandId: `${BRAND_A},${BRAND_B}`,
    categoryId: CAT_A,
    query: 'iphone',
    isFeatured: 'true',
  })
  const match = buildProductMatch(p)
  assert.equal(match.isActive, true)
  assert.equal(match.brandId.$in.length, 2)
  assert.equal(match.categoryId.$in.length, 1)
  assert.equal(match.isFeatured, true)
  assert.equal(match.$or.length, 3)
  assert.equal(match.condition, undefined)
})

test('buildProductMatch drops isActive only for includeInactive admins', () => {
  const admin = parseProductQuery({ includeAll: 'true' }, { isAdmin: true })
  assert.equal('isActive' in buildProductMatch(admin), false)
})

test('buildVariantAttrCondition returns null without variant filters', () => {
  assert.equal(buildVariantAttrCondition(parseProductQuery({})), null)
  assert.equal(buildVariantAttrCondition(parseProductQuery({ minPrice: '1000', inStock: 'true' })), null)
})

test('buildVariantAttrCondition composes storage/ram/color/condition', () => {
  assert.deepEqual(
    buildVariantAttrCondition(parseProductQuery({ storage: '128GB,256GB' })),
    { $in: ['$$v.storage', ['128GB', '256GB']] },
  )
  const multi = buildVariantAttrCondition(parseProductQuery({ storage: '128GB', color: 'Black' }))
  assert.deepEqual(multi, { $and: [{ $in: ['$$v.storage', ['128GB']] }, { $in: ['$$v.color', ['Black']] }] })
  const cond = buildVariantAttrCondition(parseProductQuery({ condition: 'GOOD' }))
  assert.deepEqual(cond, { $in: ['$$v.condition', ['GOOD']] })
})

test('buildPostLookupMatch combines availability, discount and price', () => {
  const p = parseProductQuery({ inStock: 'true', discount: 'true', minPrice: '1000', maxPrice: '9000' })
  const match = buildPostLookupMatch(p)
  assert.equal(match.inStock, true)
  assert.deepEqual(match.maxDiscount, { $gt: 0 })
  assert.deepEqual(match.lowestPrice, { $gte: 1000, $lte: 9000 })
  assert.equal(match.$or, undefined)
})

test('buildPostLookupMatch requires a matched variant for attribute filters', () => {
  const attr = buildPostLookupMatch(parseProductQuery({ storage: '128GB' }))
  assert.deepEqual(attr['_matchedVariants.0'], { $exists: true })

  const condOnly = buildPostLookupMatch(parseProductQuery({ condition: 'GOOD' }))
  assert.equal(Array.isArray(condOnly.$or), true)
  assert.deepEqual(condOnly.$or[0], { condition: { $in: ['GOOD'] } })
  assert.deepEqual(condOnly.$or[1], { '_matchedVariants.0': { $exists: true } })

  // When an attribute filter is present the condition is folded into the
  // variant filter expression, so no separate $or is needed.
  const combined = buildPostLookupMatch(parseProductQuery({ storage: '128GB', condition: 'GOOD' }))
  assert.equal(combined.$or, undefined)
  assert.deepEqual(combined['_matchedVariants.0'], { $exists: true })
})

test('buildSortDoc whitelists known sorts with createdAt tiebreakers', () => {
  assert.deepEqual(buildSortDoc('newest'), { createdAt: -1 })
  assert.deepEqual(buildSortDoc('name'), { name: 1 })
  assert.deepEqual(buildSortDoc('price_asc'), { lowestPrice: 1, createdAt: -1 })
  assert.deepEqual(buildSortDoc('price_desc'), { lowestPrice: -1, createdAt: -1 })
  assert.deepEqual(buildSortDoc('discount'), { maxDiscount: -1, createdAt: -1 })
  assert.deepEqual(buildSortDoc('rating'), { rating: -1, ratingCount: -1, createdAt: -1 })
})

test('facet value helpers clean and order option lists', () => {
  assert.deepEqual(cleanStringValues(['Black', null, '', 'Black', ' Blue ']), ['Black', 'Blue'])
  assert.equal(storageRank('128GB'), 128)
  assert.equal(storageRank('1TB'), 1024)
  assert.equal(storageRank('512GB') > storageRank('256GB'), true)
  assert.deepEqual(sortStorageValues(['256GB', '64GB', '1TB', '128GB']), ['64GB', '128GB', '256GB', '1TB'])
})
