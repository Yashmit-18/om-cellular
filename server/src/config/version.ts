import { readFileSync } from 'fs'
import { resolve } from 'path'

function readVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'))
    return String(pkg.version || '0.0.0')
  } catch {
    return '0.0.0'
  }
}

// Runtime release metadata exposed on health checks so production can be
// confirmed to match a specific commit. All sources are injected by the
// platform (Render/Vercel); nothing here is secret.
//
// `config/env.ts` is the authority on the runtime environment and refuses to
// boot without a valid NODE_ENV. This module stays dependency-free, so it
// reports the raw value and `null` when unset rather than substituting
// "development" — a health check that invents a mode would misreport exactly
// the misconfiguration it exists to reveal.
export const release = {
  version: readVersion(),
  commit:
    process.env.RENDER_GIT_COMMIT ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.COMMIT_REF ||
    null,
  nodeEnv: (process.env.NODE_ENV || '').trim() || null,
}