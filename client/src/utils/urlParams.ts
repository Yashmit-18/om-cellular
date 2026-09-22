// Canonical boolean query-param parsing, mirrors server/src/services/productFilter.service.ts
// isTruthyParam so the client read-side matches the API contract.
//
// Accepts only canonical truthy spellings (true / 'true' / '1') — the same set the
// server accepts. Everything else (false, '0', 'false', absent, unknown) → false,
// so an externally-formed URL (?inStock=1) cannot silently flip a checked filter on.
export function isTruthyParam(raw: string | null): boolean {
  return raw === 'true' || raw === '1'
}

// Returns the canonical URL spelling for a boolean so writes use exactly one token
// ('true') that both the client read-side and the server's isTruthyParam understand.
export function booleanParam(value: boolean): string {
  return value ? 'true' : ''
}
