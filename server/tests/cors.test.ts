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

/**
 * D35 — the credentialed origin allow-list is a security boundary, because
 * production auth cookies are SameSite=None (src/routes/auth.ts). Every origin
 * the list accepts is a host the browser will attach accessToken/refreshToken
 * to, so a host this project does not control is a token-exfiltration surface.
 *
 * These tests pin the allow/deny decisions to the *real* options object, so they
 * fail if an origin is reintroduced, if matching becomes a suffix/prefix or
 * wildcard test, or if the local-dev escape hatches are widened.
 */
describe('D35 credentialed origin allow-list is exactly the production frontend', () => {
  it('accepts the canonical production origin', async () => {
    const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'content-type,idempotency-key')
    assert.equal(response.status, 204, 'the canonical origin must remain allowed')
    assert.equal(response.headers.get('access-control-allow-origin'), PROD_ORIGIN)
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
  })

  it('rejects the retired secondary Vercel origin om-cellular-iota.vercel.app', async () => {
    // D35 removed this host. It was a leftover from the reverted root-vercel.json
    // deployment attempt in 7bf92a9 and is not referenced by any client code,
    // canonical link, sitemap, deployment config or CI job. It must stay out: a
    // `*.vercel.app` name resolves by wildcard DNS, so if the Vercel project name
    // is ever unclaimed it can be registered by a third party, who would then
    // receive this application's auth cookies.
    const stale = 'https://om-cellular-iota.vercel.app'
    const response = await preflight('/api/v1/orders', stale, 'content-type,idempotency-key')
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      null,
      'the retired secondary Vercel origin must not receive access-control-allow-origin',
    )
  })

  it('rejects a suffix-lookalike of the production origin', async () => {
    // Guards against a future "convenience" change from exact equality to
    // endsWith/startsWith/includes, which would let an attacker register
    // om-cellular.vercel.app.evil.com and harvest SameSite=None cookies.
    const lookalike = 'https://om-cellular.vercel.app.evil.com'
    const response = await preflight('/api/v1/orders', lookalike, 'content-type,idempotency-key')
    assert.equal(
      response.headers.get('access-control-allow-origin'),
      null,
      'a host that merely starts with the production origin must be rejected',
    )
  })

  it('rejects a prefix-lookalike and a subdomain of the production origin', async () => {
    for (const lookalike of [
      'https://om-cellular.vercel.app.attacker.net',
      'https://evil-om-cellular.vercel.app',
      'https://om-cellular.vercel.app.co',
    ]) {
      const response = await preflight('/api/v1/orders', lookalike, 'content-type,idempotency-key')
      assert.equal(
        response.headers.get('access-control-allow-origin'),
        null,
        `${lookalike} must be rejected`,
      )
    }
  })

  it('rejects a null origin (sandboxed iframe / file:// style)', async () => {
    // The browser sends `Origin: null` for sandboxed iframes and some local
    // schemes. It must never be reflected, and the configured policy must not
    // treat a missing/!origin request header as blanket permission.
    const response = await fetch(`${baseUrl}/api/v1/orders`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'null',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type,idempotency-key',
      },
    })
    const allowOrigin = response.headers.get('access-control-allow-origin')
    assert.ok(
      allowOrigin === null || allowOrigin !== 'null',
      'the literal origin `null` must never be reflected',
    )
  })

  it('does not reflect any *.vercel.app origin other than the canonical one', async () => {
    // Proves the list is an explicit enumeration, not a wildcard-suffix rule.
    for (const origin of [
      'https://om-cellular.vercel.app',
      'https://om-cellular-iota.vercel.app',
      'https://om-cellular-git-mern-migration.vercel.app',
      'https://om-cellular-preview.vercel.app',
    ]) {
      const response = await preflight('/api/v1/orders', origin, 'content-type,idempotency-key')
      const allowOrigin = response.headers.get('access-control-allow-origin')
      if (origin === PROD_ORIGIN) {
        assert.equal(allowOrigin, PROD_ORIGIN)
      } else {
        assert.equal(allowOrigin, null, `${origin} must not be reflected`)
      }
    }
  })

  it('keeps the Idempotency-Key contract intact for the canonical origin', async () => {
    // D35 changed the origin list only. The D28 header contract must be untouched.
    const response = await preflight('/api/v1/orders', PROD_ORIGIN, 'content-type,idempotency-key')
    assert.equal(response.status, 204)
    const allowed = allowedHeaderSet(response)
    for (const header of ['content-type', 'authorization', 'x-requested-with', 'idempotency-key']) {
      assert.ok(allowed.has(header), `${header} must remain allowed after the origin-list change`)
    }
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true')
  })

  it('does not widen the configured origin list beyond the intended entries', async () => {
    // Invokes the real origin resolver from src/config/cors.ts directly. It is
    // the same function object the middleware uses, so this reads the shipped
    // policy rather than a copy of it.
    const resolve = corsOptions.origin as unknown as (
      origin: string,
      cb: (err: Error | null, ok?: boolean) => void,
    ) => void

    const decide = (origin: string): boolean => {
      let decided: boolean | null = null
      resolve(origin, (err, ok) => {
        if (err) {
          // The shipped resolver signals rejection by calling back with an Error.
          decided = false
          return
        }
        decided = ok === undefined ? true : ok
      })
      assert.notEqual(decided, null, `the origin resolver must always call back for ${origin}`)
      return decided as boolean
    }

    // Allowed: the canonical production origin and the local dev entry points.
    assert.equal(decide(PROD_ORIGIN), true, 'canonical production origin must be allowed')
    assert.equal(decide('http://localhost:5173'), true, 'local dev origin must stay runnable')
    assert.equal(decide('http://localhost:3000'), true, 'local dev origin must stay runnable')

    // Denied: the retired host, look-alikes, and unrelated origins.
    for (const denied of [
      'https://om-cellular-iota.vercel.app',
      'https://om-cellular.vercel.app.evil.com',
      'https://om-cellular.vercel.app.attacker.net',
      'https://evil-om-cellular.vercel.app',
      'https://om-cellular-git-mern-migration.vercel.app',
      'https://not-our-domain.example',
      'http://om-cellular.vercel.app',
      'https://om-cellular.vercel.app:8443',
    ]) {
      assert.equal(decide(denied), false, `${denied} must not be in the allow-list`)
    }
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
