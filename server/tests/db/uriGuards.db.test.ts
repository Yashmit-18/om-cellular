/**
 * Permanent regression guard for the fail-closed URI screening.
 *
 * The DB-backed suite is only trustworthy if it can never connect to a
 * production database. These tests lock in that refusal behaviour so a future
 * edit to the screening logic cannot quietly weaken it.
 *
 * No database is started here. The screen is a pure function, and every
 * production-shaped URI below must be refused without the URI ever appearing
 * in the reason string.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

import { screenOperatorUri, TEST_DB_NAME } from '../helpers/mongodb'

const SECRET = 'sup3rs3cret'

const MUST_REFUSE: { name: string; uri: string; reason: RegExp }[] = [
  { name: 'an Atlas SRV connection string', uri: `mongodb+srv://u:${SECRET}@cluster0.abcde.mongodb.net/omcellular`, reason: /Atlas SRV/i },
  { name: 'a mongodb.net host', uri: `mongodb://u:${SECRET}@cluster0.abcde.mongodb.net:27017/${TEST_DB_NAME}`, reason: /production marker/i },
  { name: 'the project domain host', uri: `mongodb://u:${SECRET}@db.omcellular.com:27017/${TEST_DB_NAME}`, reason: /production marker/i },
  { name: 'the production database name', uri: `mongodb://127.0.0.1:27017/omcellular`, reason: /database name is not/i },
  { name: 'an unrelated database name', uri: 'mongodb://127.0.0.1:27017/some_other_db', reason: /database name is not/i },
  { name: 'something that is not a connection string', uri: 'http://127.0.0.1:27017', reason: /not a mongodb connection string/i },
  { name: 'a URI that never names a database', uri: `mongodb://u:${SECRET}@some-host.internal:27017`, reason: /does not name a database/i },
]

const MUST_ACCEPT: { name: string; uri: string }[] = [
  { name: 'a loopback test database', uri: `mongodb://127.0.0.1:27017/${TEST_DB_NAME}` },
  { name: 'a loopback test database with options', uri: `mongodb://127.0.0.1:27017/${TEST_DB_NAME}?directConnection=true` },
  { name: 'a remote-looking but non-production test host', uri: `mongodb://u:${SECRET}@localhost:27017/${TEST_DB_NAME}` },
]

describe('test URI screening refuses anything production-shaped (fail closed)', () => {
  for (const testCase of MUST_REFUSE) {
    it(`refuses ${testCase.name}`, () => {
      const reason = screenOperatorUri(testCase.uri)
      assert.ok(reason, `${testCase.name} must be refused`)
      assert.match(reason, testCase.reason)
    })
  }

  it('never echoes the URI or its credentials in the refusal reason', () => {
    for (const testCase of MUST_REFUSE) {
      const reason = screenOperatorUri(testCase.uri) || ''
      assert.ok(!reason.includes(SECRET), 'the reason must not contain the password')
      assert.ok(!reason.includes('mongodb://'), 'the reason must not contain the connection string')
      assert.ok(!reason.includes('mongodb+srv://'), 'the reason must not contain the connection string')
      assert.ok(!reason.includes('127.0.0.1:27017'), 'the reason must not contain the host')
    }
  })

  it('refuses the exact host the application is configured to use', () => {
    const previous = process.env.MONGODB_URI
    process.env.MONGODB_URI = `mongodb://u:${SECRET}@prod-host.internal:27017/omcellular`
    try {
      const reason = screenOperatorUri(`mongodb://u:${SECRET}@prod-host.internal:27017/${TEST_DB_NAME}`)
      assert.ok(reason, 'the configured production host must be refused even with a test database name')
      assert.match(reason, /configured application database host/i)
      assert.ok(!reason.includes(SECRET))
    } finally {
      if (previous === undefined) delete process.env.MONGODB_URI
      else process.env.MONGODB_URI = previous
    }
  })

  it('refuses the production database name even on a different host', () => {
    const previous = process.env.MONGODB_URI
    process.env.MONGODB_URI = `mongodb://u:${SECRET}@elsewhere.internal:27017/omcellular`
    try {
      const reason = screenOperatorUri('mongodb://127.0.0.1:27017/omcellular')
      assert.ok(reason, 'the configured production database must be refused')
      assert.match(reason, /configured application database/i)
    } finally {
      if (previous === undefined) delete process.env.MONGODB_URI
      else process.env.MONGODB_URI = previous
    }
  })

  it('still accepts a clean test URI even when a production URI is configured', () => {
    const previous = process.env.MONGODB_URI
    process.env.MONGODB_URI = `mongodb://u:${SECRET}@prod-host.internal:27017/omcellular`
    try {
      assert.equal(screenOperatorUri(`mongodb://127.0.0.1:27017/${TEST_DB_NAME}`), null)
    } finally {
      if (previous === undefined) delete process.env.MONGODB_URI
      else process.env.MONGODB_URI = previous
    }
  })
})

describe('test URI screening accepts isolated test databases', () => {
  for (const testCase of MUST_ACCEPT) {
    it(`accepts ${testCase.name}`, () => {
      assert.equal(screenOperatorUri(testCase.uri), null)
    })
  }
})
