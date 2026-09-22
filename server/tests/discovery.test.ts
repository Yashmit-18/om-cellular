import { test } from 'node:test'
import assert from 'node:assert/strict'

// These pure rules live on the client side so the storefront and the server
// test suite exercise the exact same functions (no duplicated logic drift).
import {
  COMPARE_MAX,
  addToCompare,
  removeFromCompare,
  clearCompare,
  hasCompare,
  EMPTY_COMPARE,
} from '../../client/src/utils/discovery/compare'
import { RECENTLY_VIEWED_MAX, recordViewed } from '../../client/src/utils/discovery/recentlyViewed'

const CAT_A = '507f1f77bcf86cd799439031'
const CAT_B = '507f1f77bcf86cd799439032'

test('compare: first product fixes the category', () => {
  const first = addToCompare(EMPTY_COMPARE, 'p1', CAT_A)
  assert.equal(first.error, undefined)
  assert.deepEqual(first.state.items, ['p1'])
  assert.equal(first.state.categoryId, CAT_A)
})

test('compare: same-category additions succeed up to the cap', () => {
  let state = EMPTY_COMPARE
  for (let i = 1; i <= COMPARE_MAX; i++) {
    const result = addToCompare(state, `p${i}`, CAT_A)
    assert.equal(result.error, undefined)
    assert.equal(result.state.items.length, i)
    state = result.state
  }
  assert.equal(state.items.length, COMPARE_MAX)
})

test('compare: a fifth product is rejected with max', () => {
  let state = EMPTY_COMPARE
  for (let i = 1; i <= COMPARE_MAX; i++) state = addToCompare(state, `p${i}`, CAT_A).state
  const result = addToCompare(state, 'p-extra', CAT_A)
  assert.equal(result.error, 'max')
  assert.deepEqual(result.state, state)
})

test('compare: duplicates are rejected', () => {
  const state = addToCompare(EMPTY_COMPARE, 'p1', CAT_A).state
  const dup = addToCompare(state, 'p1', CAT_A)
  assert.equal(dup.error, 'duplicate')
})

test('compare: a different category is rejected without mutating state', () => {
  const state = addToCompare(EMPTY_COMPARE, 'p1', CAT_A).state
  const mismatch = addToCompare(state, 'p2', CAT_B)
  assert.equal(mismatch.error, 'category')
  assert.deepEqual(mismatch.state, state)
})

test('compare: missing category matches an existing null category', () => {
  const state = addToCompare(EMPTY_COMPARE, 'p1', null).state
  const result = addToCompare(state, 'p2', undefined)
  assert.equal(result.error, undefined)
  assert.equal(result.state.items.length, 2)
})

test('compare: invalid product ids are rejected', () => {
  const result = addToCompare(EMPTY_COMPARE, '', CAT_A)
  assert.equal(result.error, 'invalid')
})

test('compare: remove and clear return to the empty selection', () => {
  let state = addToCompare(EMPTY_COMPARE, 'p1', CAT_A).state
  state = addToCompare(state, 'p2', CAT_A).state
  const afterRemove = removeFromCompare(state, 'p1')
  assert.deepEqual(afterRemove.items, ['p2'])
  assert.equal(hasCompare(afterRemove, 'p1'), false)
  assert.equal(hasCompare(afterRemove, 'p2'), true)

  assert.deepEqual(removeFromCompare(EMPTY_COMPARE, 'x'), EMPTY_COMPARE)
  assert.deepEqual(clearCompare(), EMPTY_COMPARE)
})

test('recently viewed: records newest-first with de-duplication', () => {
  const first = recordViewed([], 'p1')
  assert.deepEqual(first, ['p1'])
  assert.equal(recordViewed(first, 'p1')[0], 'p1')
  assert.equal(recordViewed(first, 'p1').length, 1)

  const ordered = recordViewed(recordViewed(['p1', 'p2'], 'p3'), 'p2')
  assert.equal(ordered[0], 'p2')
  assert.equal(ordered[1], 'p3')
  assert.equal(ordered.length, 3)
})

test('recently viewed: caps at the configured maximum, dropping the oldest', () => {
  let state: string[] = []
  for (let i = 0; i < RECENTLY_VIEWED_MAX + 3; i++) state = recordViewed(state, `p${i}`)
  assert.equal(state.length, RECENTLY_VIEWED_MAX)
  assert.ok(state.includes(`p${RECENTLY_VIEWED_MAX + 2}`))
  assert.ok(state.includes('p3'))
  assert.ok(!state.includes('p1'))
  assert.equal(state[0], `p${RECENTLY_VIEWED_MAX + 2}`)
})

test('recently viewed: invalid ids are ignored and small caps are respected', () => {
  assert.deepEqual(recordViewed(['p1'], ''), ['p1'])
  assert.deepEqual(recordViewed(['p1'], null), ['p1'])
  assert.deepEqual(recordViewed(['p1'], undefined), ['p1'])
  const capped = recordViewed(['p1', 'p2'], 'p3', 2)
  assert.deepEqual(capped, ['p3', 'p1'])
})

test('recently viewed: defaults match the store when cap is odd', () => {
  const state = recordViewed([], 'p1', 0)
  assert.deepEqual(state, ['p1'])
})