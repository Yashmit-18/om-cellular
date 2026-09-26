import { CorsOptions } from 'cors'
import { env } from './env'

export const corsOptions: CorsOptions = {
  origin: function (origin, callback) {
    const extraOrigins = (process.env.CLIENT_ORIGINS || '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean)

    const allowedOrigins = [
      env.CLIENT_URL,
      'https://om-cellular.vercel.app',
      'https://om-cellular-iota.vercel.app',
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
