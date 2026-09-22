// Client-side wishlist id union used when a guest signs in: the server list
// keeps its order first, then any locally-saved guest ids that the server
// doesn't already know get appended. Mirrors the documented merge rule on the
// server (server/src/services/wishlist.service.ts).
export function unionWishlistIds(serverIds: string[], localIds: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const id of [...(serverIds || []), ...(localIds || [])]) {
    if (typeof id !== 'string' || !id.trim() || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}