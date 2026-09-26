/**
 * Boots `config/env.ts` in its own process and prints a secret-free summary of
 * the resolved environment.
 *
 * `environment.test.ts` needs this because `config/env.ts` terminates the
 * process when the environment is unusable, which cannot be observed by
 * importing it into the test process. Nothing sensitive is printed: only
 * environment flags, the index policy those flags imply, and whether the JWT
 * secrets are present — never their values.
 */
import { env } from '../../src/config/env'
import { indexLifecycleOptions } from '../../src/config/indexPolicy'

const policy = indexLifecycleOptions(env.isProduction)

// Prefixed so the caller can pick this line out of anything the bootstrap
// itself printed (production mode logs a boot banner before we get here).
console.log(
  `D30_FIXTURE_JSON ${JSON.stringify({
    NODE_ENV: env.NODE_ENV,
    isProduction: env.isProduction,
    isDevelopment: env.isDevelopment,
    isTest: env.isTest,
    autoIndex: policy.autoIndex,
    autoCreate: policy.autoCreate,
    jwtConfigured: Boolean(env.JWT_SECRET && env.JWT_REFRESH_SECRET),
  })}`,
)
