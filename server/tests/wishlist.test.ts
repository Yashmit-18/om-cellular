import { test } from 'node:test'
import assert from 'node:assert/strict'

import { mergeWishlistIds, diffServerIds, isObjectIdLike } from '../src/services/wishlist.service'

const V = (n: number) => `507f1f77bcf86cd7994390${String(n).padStart(2, '0')}`
const VALID = V(11)

test('isObjectIdLike accepts 24-hex ids and rejects everything else', () => {
  assert.equal(isObjectIdLike(V(11)), true)
  assert.equal(isObjectIdLike(VALID.toUpperCase()), true)
  assert.equal(isObjectIdLike(''), false)
  assert.equal(isObjectIdLike('123'), false)
  assert.equal(isObjectIdLike('nope'), false)
  assert.equal(isObjectIdLike(null), false)
  assert.equal(isObjectIdLike(undefined), false)
  assert.equal(isObjectIdLike(42), false)
})

test('mergeWishlistIds unions server + guest without duplicates', () => {
  const merged = mergeWishlistIds([V(1), V(2)], [V(2), V(3)])
  assert.deepEqual(merged, [V(1), V(2), V(3)])
})

test('mergeWishlistIds preserves server order and appends genuinely new guest ids', () => {
  const merged = mergeWishlistIds([V(3), V(1)], [V(2), V(1), V(4)])
  assert.deepEqual(merged, [V(3), V(1), V(2), V(4)])
})

test('mergeWishlistIds is stable across calls and drops empty/garbage ids', () => {
  const first = mergeWishlistIds([V(1)], [V(2), V(1)])
  const second = mergeWishlistIds(first, [V(3)])
  assert.deepEqual(second, [V(1), V(2), V(3)])

  assert.deepEqual(mergeWishlistIds([V(1)], ['', V(2), '  ', 5 as any, V(2)]), [V(1), V(2)])
})

test('mergeWishlistIds filterIds only keeps ObjectId-shaped tokens', () => {
  assert.deepEqual(mergeWishlistIds([], [V(1), 'not-an-id', V(2)], { filterIds: true }), [V(1), V(2)])
})

test('mergeWishlistIds handles empty inputs', () => {
  assert.deepEqual(mergeWishlistIds([], []), [])
  assert.deepEqual(mergeWishlistIds([V(1)], []), [V(1)])
  assert.deepEqual(mergeWishlistIds([], [V(1)]), [V(1)])
})

test('diffServerIds returns only the ids the server does not already have', () => {
  assert.deepEqual(diffServerIds([V(1), V(2)], [V(2), V(3), V(4)]), [V(3), V(4)])
  assert.deepEqual(diffServerIds([V(1)], [V(1)]), [])
  assert.deepEqual(diffServerIds([], [V(2)]), [V(2)])
})