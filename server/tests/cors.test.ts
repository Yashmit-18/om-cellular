/**
 * D32 — CORS preflight regression.
 *
 * D31 deployed the backend and found that `POST /api/v1/orders` could never be
 * sent from a browser: the D28 client sends the mandatory `Idempotency-Key`
 * header, which is not CORS-safelisted, so the browser preflights first — and
 * the live server answered with
 *
 *   access-control-allow-headers: Content-Type,Authorization,X-Requested-With
 *
 * with no `Idempotency-Key`. The preflight fails, so the POST never leaves the
 * browser. Every server-side test still passed, because the order suite mounts
 * its routers on a bare `express()` app (tests/helpers/commerce.ts) with no
 * `cors()` middleware, so no test ever exercised a preflight. A 104/104 green
 * suite was fully consistent with checkout being broken in production.
 *
 * These tests therefore drive the *actual* `corsOptions` from src/config/cors.ts
 * through the real `cors()` middleware. The options object is imported, never
 * duplicated or re-implemented here, so this test cannot drift from what
 * production serves. A preflight is answered by the middleware before routing,
 * so no router (and no database) is mounted.
 */
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import cors from 'cors'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import { corsOptions } from '../src/config/cors'

/** The deployed production frontend, as configured in src/config/cors.ts. */
const PROD_ORIGIN = 'https://om-cellular.vercel.app'
const DISALLOWED_ORIGIN = 'https://not-our-domain.example'

let server: Server
let baseUrl: string

/** Sends a browser-shaped CORS preflight. */
function preflight(pathname: string, origin: string, requestHeaders: string, method = 'POST') {
  return fetch(`${baseUrl}${pathname}`, {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': method,
      'Access-Control-Request-Headers': requestHeaders,
    },
  })
}

/**
 * Mirrors how a browser compares the allow-list: header names are
 * case-insensitive, so this lowercases both sides before checking membership.
 */
function allowedHeaderSet(response: Response): Set<string> {
  const raw = response.headers.get('access-control-allow-headers') || ''
  return new Set(
    raw
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  )
}

before(async () => {
  const app = express()
  // The real production middleware and the real production options.
  app.use(cors(corsOptions))
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s))
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
})

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()))
})

describe('CORS preflight allows the mandatory idempotency header', () => {
  it('accepts Idempotency-Key on POST /api/v1/orders from the deployed frontend', async () => {
    // The exact request the D28 checkout page makes.
    const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'content-type,idempotency-key')

    assert.equal(response.status, 204, 'the cors middleware answers a valid preflight with 204')
    assert.ok(
      allowedHeaderSet(response).has('idempotency-key'),
      `idempotency-key must be allowed; server said: ${response.headers.get('access-control-allow-headers')}`,
    )
  })

  it('accepts the header regardless of the casing the browser sends', async () => {
    // Browsers lowercase the requested header names in Access-Control-Request-Headers.
    for (const requested of ['Idempotency-Key', 'idempotency-key', 'IDEMPOTENCY-KEY']) {
      const response = await preflight('/api/v1/orders', PROD_ORIGIN, `content-type,${requested}`)
      assert.equal(response.status, 204)
      assert.ok(
        allowedHeaderSet(response).has('idempotency-key'),
        `casing "${requested}" must not produce a false rejection`,
      )
    }
  })

  it('keeps the pre-existing headers allowed', async () => {
    const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'content-type,authorization,x-requested-with')
    assert.equal(response.status, 204)
    const allowed = allowedHeaderSet(response)
    for (const header of ['content-type', 'authorization', 'x-requested-with']) {
      assert.ok(allowed.has(header), `${header} must remain allowed`)
    }
  })

  it('still allows the idempotency header on every mutating method the orders API uses', async () => {
    // D28's contract is a POST, but the header is accepted uniformly rather
    // than only on one route, so a future PUT/PATCH carrying it is not blocked.
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'idempotency-key', method)
      assert.equal(response.status, 204, `${method} preflight should succeed`)
      assert.ok(allowedHeaderSet(response).has('idempotency-key'))
    }
  })
})

describe('CORS preflight does not loosen the existing policy', () => {
  it('echoes the concrete origin rather than a wildcard', async () => {
    const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'content-type,idempotency-key')

    const allowOrigin = response.headers.get('access-control-allow-origin')
    assert.equal(allowOrigin, PROD_ORIGIN, 'the deployed frontend origin must be echoed exactly')
    assert.notEqual(allowOrigin, '*', 'a wildcard origin is invalid with credentials and was never the policy')
  })

  it('keeps credentials enabled', async () => {
    // The auth flow uses httpOnly cookies, so credentials must stay on.
    const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'content-type,idempotency-key')
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
  })

  it('does not allow an unrelated origin', async () => {
    // The security invariant is the absence of allow-origin: whatever status the
    // error path produces, the browser denies the request without that header.
    const response = await preflight('/api/v1/orders', DISALLOWED_ORIGIN, 'content-type,idempotency-key')
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      null,
      'a disallowed origin must never receive access-control-allow-origin',
    )
  })

  it('still refuses a cross-origin request for an arbitrary origin after the fix', async () => {
    const response = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'GET',
      headers: { Origin: DISALLOWED_ORIGIN },
    })
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      null,
      'adding a request header must not widen the set of permitted origins',
    )
  })

  it('keeps the local development origin working', async () => {
    const response = await preflight('/api/v1/orders', 'http://localhost:5173', 'content-type,idempotency-key')
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:5173')
  })
})

describe('the configured policy is the one under test', () => {
  it('lists Idempotency-Key explicitly, never as a wildcard', () => {
    // Guards against a future "fix" that replaces the list with '*'.
    const configured = corsOptions.allowedHeaders as string[] | undefined
    assert.ok(Array.isArray(configured), 'allowedHeaders must stay an explicit list')
    assert.ok(!configured.includes('*'), 'wildcard allowedHeaders is forbidden')
    assert.ok(configured.includes('Idempotency-Key'), 'the idempotency header must be listed by name')
  })

  it('keeps credentials on and origins restricted', () => {
    assert.equal(corsOptions.credentials, true)
    assert.equal(typeof corsOptions.origin, 'function', 'origins must stay an explicit allow-list function')
  })
})
