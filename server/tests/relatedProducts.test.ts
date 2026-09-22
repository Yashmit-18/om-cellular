import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  scoreRelated,
  rankRelatedProducts,
  hasSimilarPrice,
  sharesAttribute,
  RELATED_SCORES,
} from '../src/services/relatedProducts.service'

const CAT = '111111111111111111111111'
const CAT_OTHER = '222222222222222222222222'
const BRAND = '333333333333333333333333'
const BRAND_OTHER = '444444444444444444444444'

const current = {
  id: 'prod-current',
  categoryId: CAT,
  brandId: BRAND,
  lowestPrice: 5000,
  storageValues: ['128GB'],
  ramValues: ['6GB'],
}

function candidate(overrides: any = {}): any {
  return {
    id: 'cand',
    name: 'Candidate',
    categoryId: CAT,
    brandId: BRAND,
    isFeatured: false,
    lowestPrice: 5499, // within a 15% band of 5000
    storageValues: ['128GB'],
    ramValues: ['6GB'],
    ...overrides,
  }
}

test('same category and brand accumulate the expected weights', () => {
  const c = candidate()
  const score = scoreRelated(c, current)
  assert.equal(score, RELATED_SCORES.sameCategory + RELATED_SCORES.sameBrand + RELATED_SCORES.similarPrice + RELATED_SCORES.matchingStorage + RELATED_SCORES.matchingRam)
})

test('mismatched category/brand simply score less, never exclude', () => {
  const weaker = scoreRelated(candidate({ categoryId: CAT_OTHER, brandId: BRAND_OTHER }), current)
  const stronger = scoreRelated(candidate(), current)
  assert.ok(weaker > 0)
  assert.ok(stronger > weaker)
})

test('the current product itself is excluded', () => {
  assert.equal(scoreRelated(candidate({ id: current.id }), current), -Number.MAX_SAFE_INTEGER)
})

test('similar price respects the band and ignores missing values', () => {
  assert.equal(hasSimilarPrice(5000, 5499), true) // within 15% of 5000
  assert.equal(hasSimilarPrice(5000, 5000), true)
  assert.equal(hasSimilarPrice(5000, 100_000), false)
  assert.equal(hasSimilarPrice(5000, 0), false)
  assert.equal(hasSimilarPrice(5000, null), false)
  assert.equal(hasSimilarPrice(null, 5499), false)
  assert.equal(hasSimilarPrice(undefined, undefined), false)
})

test('similar price uses the larger value as the band base', () => {
  assert.equal(hasSimilarPrice(1000, 1150), true) // 15% of 1150 ≈ 172
  assert.equal(hasSimilarPrice(1000, 1200), false) // 15% of 1200 = 180 > 200
})

test('sharesAttribute matches on shared storage/RAM strings, case-insensitively', () => {
  assert.equal(sharesAttribute(['128GB'], ['128GB']), true)
  assert.equal(sharesAttribute(['128gb'], ['128GB']), true)
  assert.equal(sharesAttribute(['128GB'], ['256GB']), false)
  assert.equal(sharesAttribute([], ['128GB']), false)
  assert.equal(sharesAttribute([''], ['']), false)
  assert.equal(sharesAttribute(['  '], [' ']), false)
})

test('ranking is deterministic and caps at the requested limit', () => {
  const pool = [
    candidate({ id: 'a', name: 'Alpha' }),
    candidate({ id: 'b', name: 'Bravo', categoryId: CAT_OTHER }),
    candidate({ id: 'c', name: 'Charlie', categoryId: CAT, brandId: BRAND, lowestPrice: 50 }),
    current,
  ]
  const first = rankRelatedProducts(pool, current, 6)
  const second = rankRelatedProducts(pool, current, 6)
  assert.deepEqual(first.map(x => x.id), second.map(x => x.id))
  assert.ok(first.length >= 2 && first.length <= 6)
  assert.ok(!first.some(x => x.id === current.id))

  const capped = rankRelatedProducts(pool, current, 2)
  assert.ok(capped.length <= 2)
})

test('ranking rewards the closest matching candidate first', () => {
  const pool = [
    candidate({ id: 'far-ram', ramValues: [] }),
    candidate({ id: 'near', categoryId: CAT, brandId: BRAND, lowestPrice: 5100, storageValues: ['128GB'], ramValues: ['6GB'] }),
    candidate({ id: 'far-cat', categoryId: CAT_OTHER, brandId: BRAND_OTHER }),
  ]
  const ranked = rankRelatedProducts(pool, current, 6)
  assert.equal(ranked[0].id, 'near')
})

test('featured only nudges when everything else ties', () => {
  const base = candidate()
  const featured = candidate({ id: 'feat', isFeatured: true })
  assert.equal(scoreRelated(featured, current), scoreRelated(base, current) + RELATED_SCORES.featured)
})

test('limit clamps to [1, 8] and never goes negative', () => {
  const pool = [candidate({ id: 'x' }), candidate({ id: 'y' }) ]
  assert.equal(rankRelatedProducts(pool, current, -5).length, 1)
  assert.equal(rankRelatedProducts(pool, current, 0).length, 1)
  assert.equal(rankRelatedProducts(pool, current, 99).length, 2)
})