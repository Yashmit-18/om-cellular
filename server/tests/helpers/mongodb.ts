/**
 * Isolated REAL-MongoDB harness for the DB-backed commerce regression suite.
 *
 * Fail-closed guarantees (enforced in code, not by convention):
 *
 *  1. This module NEVER uses process.env.MONGODB_URI (or ATLAS_URI /
 *     MONGODB_ATLAS_URI) to build a connection string. The application's
 *     production database configuration is never connected to by tests.
 *     The only read of MONGODB_URI is a read-only comparison used to REFUSE
 *     the very endpoint production is configured to use.
 *  2. The only two accepted sources are:
 *       a. the mongodb-memory-server instance this harness starts itself, or
 *       b. an EXPLICIT, operator-supplied TEST_MONGODB_URI.
 *     There is deliberately NO fallback to MONGODB_URI. A missing test URI
 *     starts an ephemeral cluster rather than reusing a configured one.
 *  3. Every candidate URI is screened by assertNonProductionUri() BEFORE any
 *     connection attempt. A production-shaped URI (Atlas SRV, a mongodb.net /
 *     atlas host, the project's own domain, the very host:port that
 *     MONGODB_URI points at, or any database name other than the test
 *     database) aborts the run. The URI itself is never logged or printed.
 *  4. After connecting, the harness re-verifies that it is on the test
 *     database and, unless the operator explicitly supplied TEST_MONGODB_URI,
 *     that the server it reached is a loopback address.
 *  5. Schema indexes are created explicitly after connecting so unique
 *     constraints are genuinely enforced by MongoDB (not merely declared).
 *  6. Cleanup deletes documents rather than dropping collections, so indexes
 *     survive between tests and every test starts from an empty dataset with
 *     the full constraint set intact.
 *  7. Teardown disconnects Mongoose and stops the mongod child process, even
 *     when a test throws.
 *
 * The mongod used is the OFFICIAL MongoDB Inc. build that
 * mongodb-memory-server fetches from fastdl.mongodb.org and caches under
 * node_modules/.cache/mongodb-memory-server. The version is pinned to the
 * already-cached, already-verified artifact so a run never reaches the
 * network for a binary. node_modules is git-ignored, so the binary is never
 * committed.
 */
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'

/** Pinned to the cached official build; keeps runs offline and reproducible. */
export const MONGODB_TEST_VERSION = '8.2.6'

/** The only database name this harness will ever touch. */
export const TEST_DB_NAME = 'omcellular_d25_test'

const PRODUCTION_HOST_MARKERS = ['mongodb.net', 'atlas', 'omcellular']

let memoryServer: MongoMemoryServer | null = null
let connectedUri: string | null = null
let usingOperatorUri = false

/**
 * Screens a candidate URI without ever revealing it. Returns a short,
 * non-identifying reason string, or null when the URI is acceptable.
 *
 * Exported so the refusal behaviour is a permanent, continuously re-verified
 * regression test rather than a one-time manual check.
 */
export function productionRisk(uri: string, options: { requireDatabaseName?: boolean } = {}): string | null {
  const lower = uri.toLowerCase()

  if (!lower.startsWith('mongodb://') && !lower.startsWith('mongodb+srv://')) {
    return 'not a mongodb connection string'
  }
  if (lower.startsWith('mongodb+srv://')) return 'Atlas SRV connection string'

  let host: string
  let database: string
  try {
    const afterScheme = lower.slice('mongodb://'.length)
    const slash = afterScheme.indexOf('/')
    host = slash === -1 ? afterScheme : afterScheme.slice(0, slash)
    const rest = slash === -1 ? '' : afterScheme.slice(slash + 1)
    database = rest.split('?')[0]
  } catch {
    return 'unparseable connection string'
  }

  if (PRODUCTION_HOST_MARKERS.some((marker) => host.includes(marker))) {
    return 'host matches a production marker'
  }

  // Never connect to the exact endpoint the application is configured to use.
  // Compared in-process; the production URI is never printed or returned.
  const configured = (process.env.MONGODB_URI || '').trim()
  if (configured) {
    let configuredHost: string
    let configuredDb: string
    try {
      const afterScheme = configured.toLowerCase().slice(configured.startsWith('mongodb+srv://') ? 14 : 10)
      const slash = afterScheme.indexOf('/')
      configuredHost = slash === -1 ? afterScheme : afterScheme.slice(0, slash)
      configuredDb = slash === -1 ? '' : afterScheme.slice(slash + 1).split('?')[0]
    } catch {
      configuredHost = ''
      configuredDb = ''
    }
    if (host === configuredHost) return 'host is the configured application database host'
    if (database && configuredDb && database === configuredDb) return 'database is the configured application database'
  }

  if (database && database !== TEST_DB_NAME) return 'database name is not the isolated test database'
  if (!database && options.requireDatabaseName) return 'test URI does not name a database explicitly'

  return null
}

/**
 * The exact screen applied to an operator-supplied TEST_MONGODB_URI.
 *
 * Stricter than the internal screen used for the harness's own memory-server
 * URI: an operator URI must name the isolated test database explicitly, so a
 * URI with no database component can never be pointed at an arbitrary host and
 * silently fall back to whatever database that host defaults to.
 */
export function screenOperatorUri(uri: string): string | null {
  return productionRisk(uri, { requireDatabaseName: true })
}

function hostOf(uri: string): string {
  const afterScheme = uri.toLowerCase().slice('mongodb://'.length)
  const slash = afterScheme.indexOf('/')
  return slash === -1 ? afterScheme : afterScheme.slice(0, slash)
}

function assertNonProductionUri(uri: string, source: string): void {
  const risk = source === 'TEST_MONGODB_URI' ? screenOperatorUri(uri) : productionRisk(uri)
  if (risk) {
    throw new Error(
      `Refusing to connect to the test database: the ${source} URI ${risk}. ` +
        'The DB-backed suite only ever connects to an isolated, non-production MongoDB.',
    )
  }
}

/** Starts (or reuses) the ephemeral cluster and connects Mongoose to it. */
export async function startTestDb(): Promise<void> {
  const operatorUri = (process.env.TEST_MONGODB_URI || '').trim()
  usingOperatorUri = Boolean(operatorUri)

  try {
    if (operatorUri) {
      assertNonProductionUri(operatorUri, 'TEST_MONGODB_URI')
      connectedUri = operatorUri
    } else {
      if (!memoryServer) {
        memoryServer = await MongoMemoryServer.create({
          binary: { version: MONGODB_TEST_VERSION },
          instance: {
            port: 0, // OS-assigned free port; never collides with a real cluster
            ip: '127.0.0.1',
            storageEngine: 'wiredTiger', // exercises real persistence, not ephemeralForTest
            // Lets the suite arm real MongoDB failpoints (Phase 12 failure
            // injection) so faults are injected by the database itself rather
            // than by patching application code.
            args: ['--setParameter', 'enableTestCommands=1'],
          },
        })
      }
      connectedUri = memoryServer.getUri()
      assertNonProductionUri(connectedUri, 'mongodb-memory-server')
    }

    await mongoose.connect(connectedUri, { dbName: TEST_DB_NAME })

    // Post-connect verification. Cheap, and it turns a silent misconfiguration
    // into a hard failure instead of a mutated database somewhere else.
    if (mongoose.connection.name !== TEST_DB_NAME) {
      throw new Error('Mongoose is not connected to the isolated test database.')
    }
    if (!usingOperatorUri) {
      const host = hostOf(connectedUri)
      const isLoopback = host.startsWith('127.0.0.1') || host.startsWith('localhost') || host.startsWith('[::1]')
      if (!isLoopback) {
        throw new Error('The ephemeral test server is not bound to a loopback address.')
      }
    }

    await assertRunningServerIsReal()
    await ensureIndexes()
  } catch (error) {
    // Never leave a half-started cluster (or an open Mongoose connection)
    // behind: a leaked mongod would both outlive the run and hold the event
    // loop open, turning a clear failure into a silent hang.
    await stopTestDb().catch(() => {})
    throw error
  }
}

/**
 * Asks the server that is actually running which build it is. This proves the
 * suite is talking to a real, official mongod process rather than trusting the
 * version that was merely requested.
 */
export async function assertRunningServerIsReal(): Promise<string> {
  const db = mongoose.connection.db
  if (!db) throw new Error('No active test database connection.')
  const buildInfo = await db.admin().command({ buildInfo: 1 })
  const version = String(buildInfo?.version || '')
  if (!/^\d+\.\d+/.test(version)) {
    throw new Error('The connected server did not report a recognisable mongod version; aborting (fail-closed).')
  }
  if (!usingOperatorUri && version !== MONGODB_TEST_VERSION) {
    throw new Error(`Expected the pinned mongod ${MONGODB_TEST_VERSION} but the running server reports ${version}.`)
  }
  return version
}

/** Builds every declared schema index so MongoDB really enforces the constraints. */
export async function ensureIndexes(): Promise<void> {
  const models = Object.values(mongoose.models)
  for (const model of models) {
    await model.createIndexes()
  }
}

/**
 * Empties every collection without dropping it, so unique indexes created by
 * ensureIndexes() remain in force for the next test.
 */
export async function resetTestDb(): Promise<void> {
  const db = mongoose.connection.db
  if (!db || mongoose.connection.readyState !== 1) {
    throw new Error('resetTestDb() called without an active test database connection.')
  }
  const collections = await db.listCollections({}, { nameOnly: true }).toArray()
  await Promise.all(
    collections
      .filter((entry) => !entry.name.startsWith('system.'))
      .map((entry) => db.collection(entry.name).deleteMany({})),
  )
}

/** Disconnects Mongoose and terminates the mongod child process. */
export async function stopTestDb(): Promise<void> {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect()
    }
  } finally {
    if (memoryServer) {
      const server = memoryServer
      memoryServer = null
      await server.stop().catch(() => {})
    }
    connectedUri = null
    usingOperatorUri = false
  }
}

/** True when the operator pointed the suite at their own cluster. */
export function isOperatorSuppliedUri(): boolean {
  return usingOperatorUri
}

/**
 * Resolves the fully-qualified namespace of a Mongoose model's collection so a
 * failpoint can be aimed at it without hard-coding a guessed collection name.
 */
export function collectionNamespace(model: mongoose.Model<any>): string {
  return `${TEST_DB_NAME}.${model.collection.collectionName}`
}

/**
 * Installs a real MongoDB failpoint so matching commands fail with a genuine
 * server error. Faults are injected by the database itself, so the production
 * persistence path is what breaks — no application code is patched.
 *
 * Only the FIRST `times` matching commands fail, which is what these tests
 * need. Note that mongod 8.2.6 ignores the failpoint's `skip` option (verified
 * empirically: skip=0/1/2 all fail the first match), so no `skip` knob is
 * offered here rather than shipping an option that silently does nothing.
 *
 * Command names must match what the driver actually sends:
 *   - `findByIdAndUpdate` / `findOneAndUpdate`  -> findAndModify
 *   - `updateOne` / `updateMany`                -> update
 *   - `create` / `insertOne`                    -> insert
 *
 * Returns a disposer that removes the failpoint (safe to call twice).
 */
export async function armFailPoint(options: {
  namespace: string
  failCommands: string[]
  times?: number
  errorCode?: number
}): Promise<() => Promise<void>> {
  const db = mongoose.connection.db
  if (!db) throw new Error('armFailPoint() called without an active test database connection.')

  const data: Record<string, unknown> = {
    failCommands: options.failCommands,
    namespace: options.namespace,
    errorCode: options.errorCode ?? 112, // WriteConflict: a realistic transient write failure
  }

  await db.admin().command({
    configureFailPoint: 'failCommand',
    mode: { times: options.times ?? 1 },
    data,
  })

  let cleared = false
  return async () => {
    if (cleared) return
    cleared = true
    await db.admin().command({ configureFailPoint: 'failCommand', mode: 'off' }).catch(() => {})
  }
}

/** True when the running mongod accepts configureFailPoint (test commands enabled). */
export async function supportsFailPoints(): Promise<boolean> {
  const db = mongoose.connection.db
  if (!db) return false
  try {
    await db.admin().command({ configureFailPoint: 'failCommand', mode: 'off' })
    return true
  } catch {
    return false
  }
}
