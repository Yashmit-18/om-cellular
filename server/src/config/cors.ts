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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 86400,
}
