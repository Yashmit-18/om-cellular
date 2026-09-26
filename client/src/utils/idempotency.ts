/**
 * Checkout idempotency keys.
 *
 * The key identifies one logical checkout *attempt*, not one HTTP request. A
 * retry of the same attempt must reuse the same key so the server replays the
 * original order instead of creating a second one; a genuinely new attempt must
 * use a new key. Generating it per request would defeat the whole mechanism.
 */

/** Cryptographically random bytes, available in secure and insecure contexts. */
function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length)
  const webCrypto = globalThis.crypto
  if (!webCrypto || typeof webCrypto.getRandomValues !== 'function') {
    throw new Error('A secure random source is required to create a checkout idempotency key.')
  }
  webCrypto.getRandomValues(bytes)
  return bytes
}

/**
 * Produces a canonical lowercase RFC 4122 version 4 UUID.
 *
 * The version and variant nibbles are set explicitly rather than trusted from
 * the random source, so the value always satisfies the server's strict
 * `Idempotency-Key` validation instead of being rejected for a formatting
 * detail. Lowercase is canonical because the server normalises to it, which
 * keeps one attempt to one key regardless of how it was transmitted.
 */
export function newCheckoutIdempotencyKey(): string {
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40 // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80 // variant 10xx

  const hex: string[] = []
  for (let i = 0; i < bytes.length; i += 1) hex.push(bytes[i].toString(16).padStart(2, '0'))
  const joined = hex.join('')

  return [
    joined.slice(0, 8),
    joined.slice(8, 12),
    joined.slice(12, 16),
    joined.slice(16, 20),
    joined.slice(20, 32),
  ].join('-')
}
