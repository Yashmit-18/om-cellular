import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyStagedStockClaims } from '../src/routes/orders'

function makeEngine(options: { failOn?: number; rollbackThrows?: boolean } = {}) {
  const calls = { decrement: [] as string[], rollback: [] as string[] }
  const variants: Record<string, { stock: number }> = {}
  const engine = {
    calls,
    variants,
    async decrement(variant: any, quantity: number) {
      calls.decrement.push(variant._id)
      if (options.failOn !== undefined && calls.decrement.length === options.failOn) return false
      const entry = variants[variant._id] || (variants[variant._id] = { stock: 0 })
      entry.stock -= quantity
      return true
    },
    async rollback(variantId: any, quantity: number) {
      calls.rollback.push(variantId)
      if (options.rollbackThrows) throw new Error('rollback storage unavailable')
      const entry = variants[variantId]
      if (entry) entry.stock += quantity
    },
  }
  return engine
}

const items = [
  { variant: { _id: 'a', name: 'Alpha' }, quantity: 2 },
  { variant: { _id: 'b', name: 'Beta' }, quantity: 1 },
  { variant: { _id: 'c', name: 'Gamma' }, quantity: 4 },
]

test('stages a claim for every item when stock suffices', async () => {
  const engine = makeEngine()
  const result = await applyStagedStockClaims(items, engine)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.claims.length, 3)
  assert.deepEqual(engine.calls.decrement, ['a', 'b', 'c'])
  assert.deepEqual(engine.calls.rollback, [])
  assert.deepEqual(engine.variants, { a: { stock: -2 }, b: { stock: -1 }, c: { stock: -4 } })
})

test('a losing race rolls back only the claims staged by this request', async () => {
  const engine = makeEngine({ failOn: 2 })
  const result = await applyStagedStockClaims(items, engine)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /Beta/)
  assert.deepEqual(engine.calls.decrement, ['a', 'b'], 'the losing item is attempted but its own guard rejects')
  assert.deepEqual(engine.calls.rollback, ['a'], 'the single prior claim is released')
  assert.deepEqual(engine.variants, { a: { stock: 0 } }, 'the rejected item never holds a claim')
})

test('rolls back in strict reverse claim order', async () => {
  const engine = makeEngine({ failOn: 3 })
  const result = await applyStagedStockClaims(items, engine)
  assert.equal(result.ok, false)
  assert.deepEqual(engine.calls.rollback, ['b', 'a'], 'only the staged (previously claimed) items are rolled back, in reverse')
  assert.deepEqual(engine.variants, { a: { stock: 0 }, b: { stock: 0 } }, 'the failing item never decremented, so holds no claim')
})

test('first-item failure never decrements and rolls back nothing', async () => {
  const engine = makeEngine({ failOn: 1 })
  const result = await applyStagedStockClaims(items, engine)
  assert.equal(result.ok, false)
  if (!result.ok) assert.match(result.reason, /Alpha/)
  assert.deepEqual(engine.calls.decrement, ['a'])
  assert.deepEqual(engine.calls.rollback, [])
  assert.deepEqual(engine.variants, {}, 'no decrement happened at all')
})

test('empty item list is a safe no-op', async () => {
  const engine = makeEngine()
  const result = await applyStagedStockClaims([], engine)
  assert.equal(result.ok, true)
  if (result.ok) assert.equal(result.claims.length, 0)
  assert.deepEqual(engine.calls.decrement, [])
})

test('a rollback failure propagates for visibility instead of being swallowed', async () => {
  const engine = makeEngine({ failOn: 2, rollbackThrows: true })
  await assert.rejects(applyStagedStockClaims(items, engine), /rollback storage unavailable/)
})
