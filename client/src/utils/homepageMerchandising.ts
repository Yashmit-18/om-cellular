/**
 * Deterministic homepage merchandising selection.
 *
 * Builds the three homepage product collections (Fresh Arrivals, Editor's
 * Picks, Featured) from the real catalog so that no product id appears in
 * more than one collection on the same render.
 *
 * Honesty contract: this is pure curation over real catalog rows. It never
 * invents popularity, sales or "best seller" statistics — collections are
 * seeded from existing staff-set flags (isNewArrival / isBestSeller /
 * isFeatured) and backfilled from the newest catalog rows when a flagged set
 * is thin.
 */

export interface MerchandisingCandidates<T extends { id: string }> {
  /** Newest-first catalog pool. Also the real backfill source. */
  pool: T[]
  /** Ordered curated candidates for the fresh section (e.g. isNewArrival). */
  fresh: T[]
  /** Ordered curated candidates for the picks section (e.g. isBestSeller). */
  picks: T[]
  /** Ordered curated candidates for the featured section (e.g. isFeatured). */
  featured: T[]
}

export interface MerchandisingCounts {
  fresh: number
  picks: number
  featured: number
}

export interface MerchandisingSelection<T> {
  fresh: T[]
  picks: T[]
  featured: T[]
}

export const DEFAULT_MERCHANDISING_COUNTS: MerchandisingCounts = { fresh: 8, picks: 8, featured: 8 }

/** Stable dedupe — keeps the first occurrence of each id. */
function uniqueBy<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const item of list) {
    const key = item.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

/** Ordered candidate source: curated set first, then the general newest-first pool. */
function candidatesWithPool<T extends { id: string }>(curated: T[], pool: T[]): T[] {
  return uniqueBy([...curated, ...pool])
}

/**
 * Pick `count` products from an ordered source, skipping ids already used,
 * stopping early when the source runs out.
 */
function take<T extends { id: string }>(source: T[], count: number, used: Set<string>): T[] {
  const out: T[] = []
  for (const item of source) {
    if (out.length >= count) break
    if (used.has(item.id)) continue
    used.add(item.id)
    out.push(item)
  }
  return out
}

/**
 * Select the home collections with guaranteed cross-section uniqueness.
 *
 * Ordering is fully deterministic (input order is preserved; the set of
 * already-used ids only ever removes candidates, never reorders). Thin or
 * empty collections gracefully yield fewer products — never duplicates.
 */
export function selectUniqueHomepageProducts<T extends { id: string }>(
  candidates: MerchandisingCandidates<T>,
  counts: Partial<MerchandisingCounts> = {}
): MerchandisingSelection<T> {
  const requested = { ...DEFAULT_MERCHANDISING_COUNTS, ...counts }
  const pool = uniqueBy(Array.isArray(candidates.pool) ? candidates.pool : [])
  const used = new Set<string>()

  const fresh = take(candidatesWithPool(candidates.fresh, pool), Math.max(0, requested.fresh), used)
  const picks = take(candidatesWithPool(candidates.picks, pool), Math.max(0, requested.picks), used)
  const featured = take(candidatesWithPool(candidates.featured, pool), Math.max(0, requested.featured), used)

  return { fresh, picks, featured }
}

/**
 * True when the same product id appears in two different home collections.
 * Used by tests and by dev-time assertions.
 */
export function hasCrossSectionDuplicates<T extends { id: string }>(selection: MerchandisingSelection<T>): boolean {
  const seen = new Set<string>()
  for (const group of [selection.fresh, selection.picks, selection.featured]) {
    for (const item of group) {
      if (seen.has(item.id)) return true
      seen.add(item.id)
    }
  }
  return false
}