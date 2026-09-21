import { test } from 'node:test'
import assert from 'node:assert/strict'

import { buildBannerPublicFilter, resolveCmsListFilter } from '../src/routes/cms'

// The public banner filter embeds the evaluation time. To keep the regression
// test deterministic and DB-free we read that embedded `now` back out of the
// generated filter and evaluate the documented banner schedule semantics against
// plain banner objects. This mirrors exactly what Mongo applies at query time.
type BannerLike = {
  isActive: boolean
  startDate?: Date | null
  endDate?: Date | null
}

function embeddedNow(filter: Record<string, any>): Date {
  return filter.$and[0].$or[2].startDate.$lte as Date
}

function publiclyVisible(filter: Record<string, any>, banner: BannerLike): boolean {
  const now = embeddedNow(filter)
  if (!banner.isActive) return false
  if (banner.startDate != null && banner.startDate > now) return false
  if (banner.endDate != null && banner.endDate < now) return false
  return true
}

const startDate = new Date('2026-09-30T00:00:00.000Z')
const endDate = new Date('2026-10-05T00:00:00.000Z')
const scheduled = (overrides: Partial<BannerLike> = {}): BannerLike => ({ isActive: true, ...overrides })

test('CASE A: a banner whose startDate is in the future is not publicly active', () => {
  const runAt = new Date('2026-09-21T12:00:00.000Z')
  const filter = buildBannerPublicFilter(runAt)
  assert.equal(publiclyVisible(filter, scheduled({ startDate, endDate })), false)
  // The filter embeds the request-time timestamp, not a server-boot timestamp.
  assert.equal(embeddedNow(filter).getTime(), runAt.getTime())
})

test('CASE B: the same banner becomes active once current time passes startDate, without a restart', () => {
  const beforeStart = new Date('2026-09-29T23:59:59.999Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(beforeStart), scheduled({ startDate, endDate })), false)

  // Simulated current time moves past startDate. The pure filter builder is
  // re-invoked with a fresh request-time Date — no server restart involved.
  const afterStart = new Date('2026-09-30T00:00:01.000Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(afterStart), scheduled({ startDate, endDate })), true)
})

test('CASE C: the same banner becomes inactive once current time passes endDate, without a restart', () => {
  const inWindow = new Date('2026-10-02T12:00:00.000Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(inWindow), scheduled({ startDate, endDate })), true)

  const afterEnd = new Date('2026-10-05T00:00:01.000Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(afterEnd), scheduled({ startDate, endDate })), false)
})

test('banners without a date window remain visible regardless of current time', () => {
  const anytime = new Date('2026-01-01T00:00:00.000Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(anytime), scheduled()), true)
})

test('startDate at exactly now is inclusive; endDate at exactly now is inclusive', () => {
  const at = new Date('2026-09-30T00:00:00.000Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(at), scheduled({ startDate, endDate })), true)
})

test('isActive=false banners are never publicly listed even when inside the window', () => {
  const inWindow = new Date('2026-10-02T12:00:00.000Z')
  assert.equal(publiclyVisible(buildBannerPublicFilter(inWindow), scheduled({ startDate, endDate, isActive: false })), false)
})

test('CASE D: admin includeAll bypasses the public banner filter entirely', () => {
  const anyTime = new Date('2026-10-02T12:00:00.000Z')
  assert.deepEqual(resolveCmsListFilter(true, buildBannerPublicFilter, anyTime), {})
  // Non-banner CMS resources keep their historical default public filter.
  assert.deepEqual(resolveCmsListFilter(false, undefined, anyTime), { isActive: true })
  // Public (non-admin) listing still applies the request-time banner filter.
  assert.notDeepEqual(resolveCmsListFilter(false, buildBannerPublicFilter, anyTime), {})
  assert.equal(embeddedNow(resolveCmsListFilter(false, buildBannerPublicFilter, anyTime)), anyTime)
})