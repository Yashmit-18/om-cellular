import { CorsOptions } from 'cors'
import { env } from './env'

export const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    const extraOrigins = (process.env.CLIENT_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)

    // Origins are matched by exact string equality against this list. Nothing
    // here is a suffix, wildcard or pattern, so a look-alike host such as
    // `https://om-cellular.vercel.app.evil.com` cannot match.
    //
    // D35 removed `https://om-cellular-iota.vercel.app`. It was never a
    // deployment target of this repository: it entered the allow-list in 7bf92a9
    // ("Fix Vercel SPA routing and frontend deployment") together with a root
    // `vercel.json` that ccd1e40 later deleted, and it was left behind when the
    // frontend moved to `client/vercel.json` + om-cellular.vercel.app. No client
    // code, canonical link, Open Graph tag, sitemap entry, robots.txt entry,
    // `client/vercel.json`, `netlify.toml` or CI job references that host, and
    // it serves no storefront (HTTP 404, `Server: Vercel`, `text/plain`).
    //
    // Removing it matters because production auth cookies are SameSite=None
    // (see src/routes/auth.ts), so any origin on this list is a host the browser
    // will attach accessToken/refreshToken to. An allow-listed origin that this
    // project does not control is therefore a credential-exfiltration surface.
    // `*.vercel.app` resolves by wildcard DNS, so an unclaimed project name can
    // be registered by a third party. If that host is ever genuinely needed, add
    // it back here explicitly rather than restoring a broader pattern.
    const allowedOrigins = [
      env.CLIENT_URL,
      'https://om-cellular.vercel.app',
      ...extraOrigins,
      'http://localhost:5173',
      'http://localhost:3000',
    ]
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  // `Idempotency-Key` is mandatory on POST /api/v1/orders (see the D28 header
  // contract). It is not a CORS-safelisted request header, so a cross-origin
  // checkout from the deployed frontend triggers a preflight that must
  // explicitly allow it. Without this entry the browser fails the preflight and
  // the order request is never sent — the API looks healthy and no server-side
  // test fails, because the order suite mounts its routers on a bare express()
  // app with no CORS middleware (see tests/cors.test.ts).
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
}
