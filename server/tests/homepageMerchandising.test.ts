import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  selectUniqueHomepageProducts,
  hasCrossSectionDuplicates,
  DEFAULT_MERCHANDISING_COUNTS,
} from '../../client/src/utils/homepageMerchandising'

type P = { id: string }

const p = (id: string): P => ({ id })

function catalog(ids: string[]): P[] {
  return ids.map(p)
}

test('fresh, picks and featured never overlap on a full catalog', () => {
  const pool = catalog(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9', 'c10', 'c11', 'c12'])
  // Everything is flagged everything on purpose — the overlap risk is maximal.
  const sel = selectUniqueHomepageProducts({ pool, fresh: pool, picks: pool, featured: pool }, { fresh: 4, picks: 4, featured: 4 })
  assert.equal(hasCrossSectionDuplicates(sel), false)
  const allIds = [...sel.fresh, ...sel.picks, ...sel.featured].map(x => x.id)
  assert.equal(new Set(allIds).size, allIds.length)
  assert.equal(sel.fresh.length, 4)
  assert.equal(sel.picks.length, 4)
  assert.equal(sel.featured.length, 4)
})

test('pairwise intersections are empty', () => {
  const pool = catalog(Array.from({ length: 24 }, (_, i) => `p${i}`))
  const sel = selectUniqueHomepageProducts({ pool, fresh: pool, picks: pool, featured: pool })
  const ids = (list: P[]) => new Set(list.map(x => x.id))
  const fresh = ids(sel.fresh)
  const picks = ids(sel.picks)
  const featured = ids(sel.featured)
  const inter = (a: Set<string>, b: Set<string>) => {
    let n = 0
    a.forEach(id => { if (b.has(id)) n += 1 })
    return n
  }
  assert.equal(inter(fresh, picks), 0)
  assert.equal(inter(fresh, featured), 0)
  assert.equal(inter(picks, featured), 0)
})

test('flagged candidates are preferred over pool backfill', () => {
  const pool = catalog(['pool-a', 'pool-b', 'pool-c', 'pool-d', 'pool-e', 'pool-f'])
  const flag = catalog(['flag-x', 'flag-y'])
  const sel = selectUniqueHomepageProducts({ pool, fresh: flag, picks: pool, featured: pool }, { fresh: 4, picks: 2, featured: 2 })
  // Fresh leads with the flagged ids, then fills from the newest pool rows.
  assert.deepEqual(sel.fresh.map(x => x.id), ['flag-x', 'flag-y', 'pool-a', 'pool-b'])
  // Picks can never reuse the ids fresh already took.
  assert.deepEqual(sel.picks.map(x => x.id), ['pool-c', 'pool-d'])
  // Featured is forced deeper into the pool.
  assert.deepEqual(sel.featured.map(x => x.id), ['pool-e', 'pool-f'])
  assert.equal(hasCrossSectionDuplicates(sel), false)
})

test('duplicate candidate ids are handled within a list', () => {
  const pool = catalog(['a', 'b', 'a', 'c'])
  const sel = selectUniqueHomepageProducts({ pool, fresh: pool, picks: [], featured: [] }, { fresh: 4, picks: 0, featured: 0 })
  assert.deepEqual(sel.fresh.map(x => x.id), ['a', 'b', 'c'])
})

test('insufficient products return fewer products, never duplicates', () => {
  const pool = catalog(['a', 'b'])
  const sel = selectUniqueHomepageProducts({ pool, fresh: pool, picks: pool, featured: pool }, { fresh: 8, picks: 8, featured: 8 })
  assert.equal(sel.fresh.length, 2)
  assert.equal(sel.picks.length, 0)
  assert.equal(sel.featured.length, 0)
  assert.equal(hasCrossSectionDuplicates(sel), false)
})

test('empty candidate lists do not crash', () => {
  const sel = selectUniqueHomepageProducts({ pool: [], fresh: [], picks: [], featured: [] })
  assert.deepEqual(sel, { fresh: [], picks: [], featured: [] })
})

test('ordering is deterministic across calls', () => {
  const pool = catalog(['a', 'b', 'c', 'd', 'e', 'f'])
  const input = { pool, fresh: catalog(['a', 'b']), picks: catalog(['c', 'd']), featured: catalog(['e', 'f']) }
  const a = selectUniqueHomepageProducts(input)
  const b = selectUniqueHomepageProducts(input)
  assert.deepEqual(a, b)
})

test('default counts are applied when no counts passed', () => {
  const pool = catalog(Array.from({ length: 30 }, (_, i) => `p${i}`))
  const sel = selectUniqueHomepageProducts({ pool, fresh: pool, picks: [], featured: [] })
  assert.equal(sel.fresh.length, DEFAULT_MERCHANDISING_COUNTS.fresh)
  assert.equal(sel.picks.length, DEFAULT_MERCHANDISING_COUNTS.picks)
  assert.equal(sel.featured.length, DEFAULT_MERCHANDISING_COUNTS.featured)
})

test('non-positive counts produce empty sections', () => {
  const pool = catalog(['a', 'b', 'c'])
  const sel = selectUniqueHomepageProducts({ pool, fresh: pool, picks: pool, featured: pool }, { fresh: 0, picks: 2, featured: 1 })
  assert.deepEqual(sel.fresh, [])
  assert.deepEqual(sel.picks.map(x => x.id), ['a', 'b'])
  assert.deepEqual(sel.featured.map(x => x.id), ['c'])
})