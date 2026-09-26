/**
 * D30 — fail-closed runtime environment.
 *
 * `config/env.ts` used to default an absent NODE_ENV to `development`. Because
 * `isProduction` gates every production-only safeguard, that single default
 * switched all of them off at once: mandatory secret enforcement, the
 * 32-character JWT minimum, `secure` auth cookies, generic client-facing error
 * messages, the password-reset token withheld from API responses, and — via
 * `indexPolicy` — the block on Mongoose rebuilding schema indexes at startup.
 *
 * NODE_ENV is now validated against an explicit allow-list and never defaulted.
 * These tests lock that behaviour in two layers:
 *
 *  1. The pure resolver, exhaustively and in-process.
 *  2. The real bootstrap in a child process, because "fails closed" is only
 *     meaningful if the process actually refuses to start.
 */
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

import { resolveRuntimeEnvironment, UnsupportedEnvironmentError } from '../src/config/environment'
import { describeError, redactCredentials } from '../src/config/redact'

const SERVER_ROOT = path.resolve(__dirname, '..')
const FIXTURE = path.resolve(__dirname, 'fixtures/bootEnv.ts')

/** The secret-free shape printed by `fixtures/bootEnv.ts`. */
interface BootSummary {
  NODE_ENV: string
  isProduction: boolean
  isDevelopment: boolean
  isTest: boolean
  autoIndex: boolean
  autoCreate: boolean
  jwtConfigured: boolean
}

/** Obviously fake, non-secret values used to satisfy the production checks. */
const FAKE_LONG_SECRET = 'd30-fixture-secret-not-a-real-credential-0000'

interface BootResult {
  status: number | null
  summary: BootSummary | null
  stderr: string
}

function bootEnv(overrides: Record<string, string>): BootResult {
  const result = spawnSync(process.execPath, ['--import', 'tsx', FIXTURE], {
    cwd: SERVER_ROOT,
    encoding: 'utf8',
    timeout: 120_000,
    env: {
      ...process.env,
      // dotenv never overrides a key that is already present, so passing these
      // as empty strings makes every run deterministic: they cannot be filled
      // in from a developer's real `server/.env`. A test that silently read a
      // local .env would pass on one machine and fail on another.
      MONGODB_URI: '',
      JWT_SECRET: '',
      JWT_REFRESH_SECRET: '',
      CLIENT_URL: '',
      RAZORPAY_KEY_ID: '',
      RAZORPAY_KEY_SECRET: '',
      RAZORPAY_WEBHOOK_SECRET: '',
      ...overrides,
    },
  })

  const prefix = 'D30_FIXTURE_JSON '
  const stdout = (result.stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.startsWith(prefix))

  return {
    status: result.status,
    summary: stdout ? (JSON.parse(stdout.slice(prefix.length)) as BootSummary) : null,
    stderr: result.stderr || '',
  }
}

/** Asserts the bootstrap refused to start, and says why. */
function assertRefusedToBoot(overrides: Record<string, string>, expectedInMessage: string) {
  const { status, summary, stderr } = bootEnv(overrides)
  assert.equal(summary, null, 'the server must not report a resolved environment after refusing to boot')
  assert.notEqual(status, 0, 'a fatal misconfiguration must exit non-zero')
  assert.match(stderr, /\[env\] Fatal/, 'a fatal misconfiguration must be reported clearly')
  assert.ok(
    stderr.includes(expectedInMessage),
    `expected the fatal message to mention "${expectedInMessage}", got: ${stderr.trim()}`,
  )
}

describe('runtime environment resolution', () => {
  it('accepts the three supported environments', () => {
    assert.equal(resolveRuntimeEnvironment('development'), 'development')
    assert.equal(resolveRuntimeEnvironment('test'), 'test')
    assert.equal(resolveRuntimeEnvironment('production'), 'production')
  })

  it('normalises case and surrounding whitespace', () => {
    // `Production` was already treated as production before D30, so this is
    // preserved rather than tightened — tightening it would break a deploy.
    assert.equal(resolveRuntimeEnvironment('  Production  '), 'production')
    assert.equal(resolveRuntimeEnvironment('TEST'), 'test')
  })

  it('refuses a missing NODE_ENV instead of defaulting to development', () => {
    // This is the D30 fix. The old code returned 'development' here.
    assert.throws(() => resolveRuntimeEnvironment(undefined), UnsupportedEnvironmentError)
    assert.throws(() => resolveRuntimeEnvironment(''), UnsupportedEnvironmentError)
    assert.throws(() => resolveRuntimeEnvironment('   '), UnsupportedEnvironmentError)
  })

  it('refuses a misspelt or unsupported NODE_ENV rather than guessing', () => {
    // Each of these used to boot as a non-production environment, silently
    // applying development security to whatever database it connected to.
    for (const value of ['prod', 'staging', 'dev', 'prodution', 'none', '1']) {
      assert.throws(
        () => resolveRuntimeEnvironment(value),
        UnsupportedEnvironmentError,
        `"${value}" must not be accepted`,
      )
    }
  })
})

describe('startup refuses a misconfigured environment', () => {
  it('does not boot when NODE_ENV is empty', () => {
    assertRefusedToBoot({ NODE_ENV: '' }, 'NODE_ENV is not set')
  })

  it('does not boot when NODE_ENV is unsupported', () => {
    assertRefusedToBoot({ NODE_ENV: 'prod' }, 'is not a supported environment')
  })

  it('explains which values are supported', () => {
    const { stderr } = bootEnv({ NODE_ENV: 'prod' })
    for (const expected of ['development', 'test', 'production']) {
      assert.ok(stderr.includes(expected), `the fatal message should list "${expected}"`)
    }
  })
})

describe('production still enforces its own requirements', () => {
  it('does not boot when a mandatory variable is missing', () => {
    // NODE_ENV=production must never quietly inherit development fallbacks.
    assertRefusedToBoot(
      { NODE_ENV: 'production', MONGODB_URI: '', JWT_SECRET: '', JWT_REFRESH_SECRET: '', CLIENT_URL: '' },
      'missing required environment variable',
    )
  })

  it('does not boot when the JWT secrets are too short', () => {
    assertRefusedToBoot(
      {
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://127.0.0.1:27017/d30-fixture',
        JWT_SECRET: 'too-short',
        JWT_REFRESH_SECRET: FAKE_LONG_SECRET,
        CLIENT_URL: 'https://example.invalid',
      },
      'at least 32 characters',
    )
  })
})

describe('a valid environment boots with the expected policy', () => {
  it('production disables automatic index creation', () => {
    // The D29 guarantee, now reached only through a validated NODE_ENV. A
    // production deploy that lost the variable exits instead of reaching here.
    const { status, summary } = bootEnv({
      NODE_ENV: 'production',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/d30-fixture',
      JWT_SECRET: FAKE_LONG_SECRET,
      JWT_REFRESH_SECRET: FAKE_LONG_SECRET,
      CLIENT_URL: 'https://example.invalid',
    })
    assert.equal(status, 0)
    assert.ok(summary)
    assert.equal(summary.isProduction, true)
    assert.equal(summary.isDevelopment, false)
    assert.equal(summary.autoIndex, false, 'production must not create indexes on startup')
    assert.equal(summary.autoCreate, false, 'production must not create collections on startup')
  })

  it('a whitespace-and-case variant of production is still production', () => {
    const { status, summary } = bootEnv({
      NODE_ENV: '  Production  ',
      MONGODB_URI: 'mongodb://127.0.0.1:27017/d30-fixture',
      JWT_SECRET: FAKE_LONG_SECRET,
      JWT_REFRESH_SECRET: FAKE_LONG_SECRET,
      CLIENT_URL: 'https://example.invalid',
    })
    assert.equal(status, 0)
    assert.ok(summary)
    assert.equal(summary.isProduction, true)
    assert.equal(summary.autoIndex, false)
  })

  it('development is explicit and keeps index creation available', () => {
    const { status, summary } = bootEnv({ NODE_ENV: 'development' })
    assert.equal(status, 0)
    assert.ok(summary)
    assert.equal(summary.isDevelopment, true)
    assert.equal(summary.isProduction, false)
    assert.equal(summary.autoIndex, true)
    assert.equal(summary.autoCreate, true)
  })

  it('test mode is not development', () => {
    // This is the flag that withholds `devResetToken` from the password-reset
    // response (server/src/routes/auth.ts). The regression suite runs here, so
    // the plaintext token is never returned even against a test database.
    const { status, summary } = bootEnv({ NODE_ENV: 'test' })
    assert.equal(status, 0)
    assert.ok(summary)
    assert.equal(summary.isTest, true)
    assert.equal(summary.isDevelopment, false)
    assert.equal(summary.isProduction, false)
    // The real-MongoDB suite asserts against enforced indexes, so this must
    // stay enabled or the suite would prove nothing.
    assert.equal(summary.autoIndex, true)
    assert.equal(summary.autoCreate, true)
  })

  it('never leaves the JWT secrets unconfigured once it boots', () => {
    for (const NODE_ENV of ['development', 'test']) {
      const { status, summary } = bootEnv({ NODE_ENV })
      assert.equal(status, 0)
      assert.ok(summary)
      assert.equal(summary.jwtConfigured, true, `${NODE_ENV} must resolve a JWT secret`)
    }
  })
})

describe('credentials are redacted before they reach a log', () => {
  // A single failed production connection would otherwise leave the live
  // MONGODB_URI in retained Render log storage.
  it('removes userinfo from a MongoDB connection string', () => {
    assert.equal(
      redactCredentials('failed to parse mongodb+srv://omcellular:PASS123@cluster0.abcde.mongodb.net/app'),
      'failed to parse mongodb+srv://<redacted>@cluster0.abcde.mongodb.net/app',
    )
    assert.equal(
      redactCredentials('could not connect to mongodb://admin:hunter2@10.0.0.5:27017/omcellular'),
      'could not connect to mongodb://<redacted>@10.0.0.5:27017/omcellular',
    )
  })

  it('keeps the host, which is needed to diagnose the failure', () => {
    const redacted = redactCredentials('mongodb+srv://u:p@cluster0.abcde.mongodb.net/omcellular')
    assert.ok(redacted.includes('cluster0.abcde.mongodb.net'))
  })

  it('leaves text without credentials untouched', () => {
    const benign = 'MongoServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017'
    assert.equal(redactCredentials(benign), benign)
  })

  it('describes a driver error without its credentials', () => {
    const error = Object.assign(
      new Error('Authentication failed against mongodb+srv://u:realpassword@cluster0.abcde.mongodb.net/app'),
      { name: 'MongoServerError', code: 18 },
    )
    const described = describeError(error)
    assert.ok(described.includes('MongoServerError'))
    assert.ok(described.includes('18'), 'the code must survive so the failure stays diagnosable')
    assert.ok(!described.includes('realpassword'), 'the password must not be logged')
  })

  it('describes a non-Error throw safely', () => {
    assert.equal(describeError('mongodb+srv://u:p@host/app'), 'mongodb+srv://<redacted>@host/app')
    assert.equal(describeError(undefined), 'undefined')
  })
})
