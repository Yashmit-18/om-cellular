/**
 * Runtime environment resolution.
 *
 * Side-effect free, mirroring `indexPolicy.ts`, so the rule can be asserted
 * directly by tests without importing the configuration bootstrap (which
 * terminates the process when the environment is unusable).
 */

/**
 * The only environments this server may boot in.
 *
 * There is deliberately no fourth "unset" mode. Every consumer of
 * `isProduction` treats anything that is not `production` as safe to relax
 * (mandatory secrets, JWT minimum length, secure cookie flags, generic error
 * messages, and — via `indexPolicy` — Mongoose's automatic index creation), so
 * an unrecognised environment is not a neutral state. It is a request to run
 * production with development security, and the server must refuse it.
 */
export const RUNTIME_ENVIRONMENTS = ['development', 'test', 'production'] as const

export type RuntimeEnvironment = (typeof RUNTIME_ENVIRONMENTS)[number]

export function isRuntimeEnvironment(value: string): value is RuntimeEnvironment {
  return (RUNTIME_ENVIRONMENTS as readonly string[]).includes(value)
}

/** Thrown when NODE_ENV is absent or names an environment we do not support. */
export class UnsupportedEnvironmentError extends Error {
  readonly received: string | undefined

  constructor(received: string | undefined) {
    const trimmed = (received ?? '').trim()
    super(
      trimmed
        ? `NODE_ENV="${trimmed}" is not a supported environment. Set it to one of: ${RUNTIME_ENVIRONMENTS.join(', ')}.`
        : 'NODE_ENV is not set. The server refuses to guess its environment, because an unset ' +
            'NODE_ENV previously defaulted to "development" and silently disabled every production-only ' +
            'safeguard: mandatory secret enforcement, the 32-character JWT minimum, secure auth cookies, ' +
            'generic error messages, and the startup block on automatic index creation. ' +
            `Set NODE_ENV to one of: ${RUNTIME_ENVIRONMENTS.join(', ')}. ` +
            'For local development use `npm run dev` (which sets it for you) or copy server/.env.example to server/.env.',
    )
    this.name = 'UnsupportedEnvironmentError'
    this.received = received
  }
}

/**
 * Validates and normalises NODE_ENV. Never returns a fallback.
 *
 * Case and surrounding whitespace are normalised so `Production` and
 * ` production ` behave exactly like `production`; a value that is merely
 * *similar* to a supported environment (`prod`, `staging`, `dev`, `prodution`)
 * is rejected rather than coerced, because coercing it would be a guess.
 */
export function resolveRuntimeEnvironment(raw: string | undefined): RuntimeEnvironment {
  const value = (raw ?? '').trim().toLowerCase()
  if (!isRuntimeEnvironment(value)) throw new UnsupportedEnvironmentError(raw)
  return value
}
