// Pure wishlist helpers (no database) so node:test can exercise the merge /
// dedupe rules without a running Mongo (see tests/wishlist.test.ts). The
// routes remain the authoritative validator — these only centralize the rules.

const OBJECT_ID_RE = /^[0-9a-f]{24}$/i

// True when the value is a Mongo ObjectId-shaped string.
export function isObjectIdLike(value: unknown): boolean {
  return typeof value === 'string' && OBJECT_ID_RE.test(value)
}

// Union-merge two wishlist id lists: a stable, duplicate-free array that keeps
// the existing (server) order first and appends any genuinely new guest ids.
// Used when a guest signs in so their local wishlist is preserved instead of
// silently overwriting the user's existing server wishlist.
export function mergeWishlistIds(existing: string[], incoming: string[], opts: { filterIds?: boolean } = {}): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  const sources = [...(existing || []), ...(incoming || [])]
  for (const id of sources) {
    if (typeof id !== 'string' || !id.trim()) continue
    if (opts.filterIds && !isObjectIdLike(id)) continue
    if (seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

// Returns the ids that exist locally but not on the server — the exact slice
// a login-merge must push so the server copy catches up with the guest list.
export function diffServerIds(existing: string[], incoming: string[], opts: { filterIds?: boolean } = {}): string[] {
  const known = new Set(existing || [])
  const out: string[] = []
  for (const id of incoming || []) {
    if (typeof id !== 'string' || !id.trim()) continue
    if (opts.filterIds && !isObjectIdLike(id)) continue
    if (known.has(id)) continue
    known.add(id)
    out.push(id)
  }
  return out
}