/**
 * D29 — production index-lifecycle policy.
 *
 * The D28 schema adds `uniq_user_idempotency_key`. Mongoose builds declared
 * indexes by default the moment a connection opens, so before this policy a
 * production deploy would have created that unique index on the live orders
 * collection simply by booting, with no data audit and no rollback.
 *
 * These assertions exist to make that regression impossible to reintroduce by
 * accident: a deleted or weakened policy would silently hand production schema
 * migration back to application startup.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { indexLifecycleOptions } from '../src/config/indexPolicy'

describe('index lifecycle policy', () => {
  it('never builds indexes on a production connection', () => {
    const policy = indexLifecycleOptions(true)
    assert.equal(policy.autoIndex, false, 'production startup must not create the idempotency index')
    assert.equal(policy.autoCreate, false, 'production startup must not create collections either')
  })

  it('keeps index creation enabled for development and the test harness', () => {
    // The real-MongoDB suite asserts against enforced indexes, so disabling
    // this off-production would make the suite prove nothing.
    for (const isProduction of [false]) {
      const policy = indexLifecycleOptions(isProduction)
      assert.equal(policy.autoIndex, true)
      assert.equal(policy.autoCreate, true)
    }
  })

  it('is driven purely by the production flag, with no other input', () => {
    assert.deepEqual(indexLifecycleOptions(true), { autoIndex: false, autoCreate: false })
    assert.deepEqual(indexLifecycleOptions(false), { autoIndex: true, autoCreate: true })
  })
})
