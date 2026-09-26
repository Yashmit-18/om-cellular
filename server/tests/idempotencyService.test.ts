/**
 * D28 — DB-free unit tests for the pure checkout-idempotency logic.
 *
 * The database-enforced behaviour is proven in tests/db/orderIdempotency.db.test.ts
 * against real MongoDB. What is covered here is the decision logic that decides
 * *which* unique-index violation occurred, because that branch is what keeps an
 * orderNumber collision from being replayed as a checkout retry (and vice versa).
 * Getting it wrong would either swallow a real collision or report a replay for
 * an order that does not exist, and neither failure is visible in a status code
 * alone.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import {
  parseIdempotencyHeader,
  isIdempotencyKeyCollision,
  isOrderNumberCollision,
  IDEMPOTENCY_HEADER,
} from '../src/services/idempotency.service'

const V4 = '550e8400-e29b-41d4-a716-446655440000'

/** Shapes the driver and Mongoose actually produce for a unique violation. */
function duplicateKeyError(fields: Record<string, number>, indexInMessage?: string) {
  const err: any = new Error(
    `E11000 duplicate key error collection: db.orders index: ${indexInMessage ?? Object.keys(fields).join('_')} dup key`,
  )
  err.code = 11000
  err.keyPattern = fields
  return err
}

describe('parseIdempotencyHeader', () => {
  it('accepts a canonical v4 key and lowercases it', () => {
    const result = parseIdempotencyHeader(V4)
    assert.deepEqual(result, { ok: true, key: V4 })
    assert.deepEqual(parseIdempotencyHeader(V4.toUpperCase()), { ok: true, key: V4 }, 'casing must not fork an attempt')
    assert.deepEqual(parseIdempotencyHeader(`  ${V4}  `), { ok: true, key: V4 }, 'surrounding whitespace is not meaningful')
  })

  it('reports an absent header as missing', () => {
    assert.deepEqual(parseIdempotencyHeader(undefined), { ok: false, reason: 'missing' })
    assert.deepEqual(parseIdempotencyHeader(null), { ok: false, reason: 'missing' })
  })

  it('reports a present but unusable header as malformed', () => {
    // Distinguishing these matters: "you forgot the header" and "you sent a
    // broken one" are different client bugs.
    for (const raw of ['', '   ', 'nope', '550e8400-e29b-11d4-a716-446655440000', '550e8400e29b41d4a716446655440000']) {
      assert.deepEqual(parseIdempotencyHeader(raw), { ok: false, reason: 'malformed' }, `for ${JSON.stringify(raw)}`)
    }
  })

  it('refuses an ambiguous repeated header instead of picking one', () => {
    assert.deepEqual(parseIdempotencyHeader([V4, V4]), { ok: false, reason: 'malformed' })
    assert.deepEqual(parseIdempotencyHeader([V4]), { ok: true, key: V4 })
  })

  it('exposes the canonical header name', () => {
    assert.equal(IDEMPOTENCY_HEADER, 'Idempotency-Key')
  })
})

describe('unique-violation classification', () => {
  it('recognises the idempotency index and only that index', () => {
    const err = duplicateKeyError({ userId: 1, idempotencyKey: 1 })
    assert.equal(isIdempotencyKeyCollision(err), true)
    assert.equal(isOrderNumberCollision(err), false, 'an idempotency collision must never be retried as a number collision')
  })

  it('recognises the orderNumber index and only that index', () => {
    const err = duplicateKeyError({ orderNumber: 1 })
    assert.equal(isOrderNumberCollision(err), true)
    assert.equal(isIdempotencyKeyCollision(err), false)
  })

  it('falls back to the index name when keyPattern is unavailable', () => {
    const messageOnly: any = new Error('E11000 duplicate key error collection: db.orders index: uniq_user_idempotency_key dup key')
    messageOnly.code = 11000
    assert.equal(isIdempotencyKeyCollision(messageOnly), true)

    const numberOnly: any = new Error('E11000 duplicate key error collection: db.orders index: orderNumber_1 dup key')
    numberOnly.code = 11000
    assert.equal(isOrderNumberCollision(numberOnly), true)
  })

  it('ignores errors that are not unique violations', () => {
    const notDuplicate = Object.assign(new Error('write conflict'), { code: 112 })
    assert.equal(isIdempotencyKeyCollision(notDuplicate), false)
    assert.equal(isOrderNumberCollision(notDuplicate), false)
    assert.equal(isIdempotencyKeyCollision(new Error('boom')), false)
    assert.equal(isOrderNumberCollision(undefined), false)
  })
})
