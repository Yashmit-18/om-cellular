/**
 * Shared lifecycle for the DB-backed suite.
 *
 * Every DB-backed test file uses exactly this wiring, so an isolated mongod is
 * started once per file and is always torn down again — including when a
 * `before` hook or a test throws. Registering the teardown first is what stops
 * a failed startup from leaking a mongod process and hanging the run.
 */
import { after, before, beforeEach } from 'node:test'
import { startTestDb, resetTestDb, stopTestDb, assertRunningServerIsReal } from './mongodb'
import { startCommerceClient, type CommerceClient } from './commerce'

let client: CommerceClient | null = null
let started = false

/** Starts the isolated database and the real HTTP surface for this file. */
export function useIsolatedDatabase(): void {
  // Registered before startup so it still runs if startup throws.
  after(async () => {
    if (client) await client.close().catch(() => {})
    await stopTestDb().catch(() => {})
  })

  before(async () => {
    await startTestDb()
    started = true
    client = await startCommerceClient()
  })

  beforeEach(async () => {
    if (!started) throw new Error('The isolated test database was never started.')
    await resetTestDb()
  })
}

/** The live HTTP client for this test file. */
export function commerceClient(): CommerceClient {
  if (!client) throw new Error('useIsolatedDatabase() must be called at file scope before commerceClient().')
  return client
}

/** Version string reported by the mongod that is actually serving this run. */
export async function runningServerVersion(): Promise<string> {
  return assertRunningServerIsReal()
}
