// Pure recently-viewed rollover rules. No React / DOM / server touches so the
// same cap/dedupe ordering can be asserted from the server test suite via
// node:test (this file stays dependency-free).

export const RECENTLY_VIEWED_MAX = 12

export function normalizeProductId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

// Records a product view: newest-first, de-duplicated (re-viewing moves the
// id to the front instead of duplicating it) and capped at `max` entries.
export function recordViewed(
  previous: string[],
  productId: unknown,
  max: number = RECENTLY_VIEWED_MAX,
): string[] {
  const id = normalizeProductId(productId)
  const safePrevious = Array.isArray(previous) ? previous : []
  if (!id) return safePrevious
  const filtered = safePrevious.filter(existing => existing !== id)
  const next = [id, ...filtered]
  const safeMax = Number.isFinite(max) && max > 0 ? Math.floor(max) : RECENTLY_VIEWED_MAX
  return next.slice(0, safeMax)
}