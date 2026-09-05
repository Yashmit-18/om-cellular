// Lightweight in-memory brute-force protection for the login endpoint.
// Records failures per (identifier + ip) and applies exponential backoff after
// consecutive failures. Safe on a single Node process; replace with Redis if
// running multiple server instances.

interface FailureRecord {
  failures: number
  firstFailureAt: number
  lockedUntil: number
}

const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const FAILURES_BEFORE_LOCK: Record<number, number> = {
  3: 60_000, // 3 failures -> 1 minute
  5: 5 * 60_000, // 5 failures -> 5 minutes
  8: 15 * 60_000, // 8 failures -> 15 minutes
}
const MAX_FAILURES = 8
const MAX_LOCK_MS = 15 * 60_000
const MAX_RECORDS = 10000

const store = new Map<string, FailureRecord>()

function prune() {
  if (store.size <= MAX_RECORDS) return
  const now = Date.now()
  for (const [key, record] of store) {
    if (now - record.firstFailureAt > ATTEMPT_WINDOW_MS) store.delete(key)
  }
  // Hard cap fallback.
  if (store.size > MAX_RECORDS) {
    const keys = [...store.keys()]
    for (const key of keys.slice(0, store.size - MAX_RECORDS)) store.delete(key)
  }
}

export interface LockStatus {
  locked: boolean
  retryAfterSeconds: number
}

export function isLoginLocked(identifier: string, ip?: string): LockStatus {
  const key = `${identifier}|${ip || ''}`
  const record = store.get(key)
  if (!record) return { locked: false, retryAfterSeconds: 0 }
  if (record.lockedUntil > Date.now()) {
    return { locked: true, retryAfterSeconds: Math.ceil((record.lockedUntil - Date.now()) / 1000) }
  }
  return { locked: false, retryAfterSeconds: 0 }
}

export function recordLoginFailure(identifier: string, ip?: string): LockStatus {
  const key = `${identifier}|${ip || ''}`
  const now = Date.now()
  const record = store.get(key)
  const fresh = !record || now - record.firstFailureAt > ATTEMPT_WINDOW_MS

  const failures = fresh ? 1 : record.failures + 1
  const firstFailureAt = fresh ? now : record.firstFailureAt

  let lockedUntil = 0
  // Re-armed lock: past lock, but user is failing again.
  if (!fresh && record!.lockedUntil > now) {
    lockedUntil = record!.lockedUntil
  } else if (failures >= MAX_FAILURES) {
    lockedUntil = now + MAX_LOCK_MS
  } else {
    for (const threshold of Object.keys(FAILURES_BEFORE_LOCK).map(Number).sort((a, b) => a - b)) {
      if (failures === threshold) lockedUntil = now + FAILURES_BEFORE_LOCK[threshold]
    }
  }

  store.set(key, { failures, firstFailureAt, lockedUntil })
  prune()
  return { locked: lockedUntil > now, retryAfterSeconds: lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0 }
}

export function resetLoginFailures(identifier: string, ip?: string): void {
  const key = `${identifier}|${ip || ''}`
  store.delete(key)
}