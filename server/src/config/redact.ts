/**
 * Log redaction.
 *
 * Side-effect free, mirroring `indexPolicy.ts` and `environment.ts`, so the
 * rule can be asserted directly by tests without importing the database
 * bootstrap (which loads configuration and a connection string on import).
 */

/**
 * Strips credentials from anything about to be written to a log.
 *
 * Driver failures routinely quote the connection string back — a malformed SRV
 * URI or an authentication error can surface `mongodb+srv://user:password@host`
 * verbatim. Deployment logs are retained and readable by anyone with dashboard
 * access, so a single connection failure at 3am would otherwise leave live
 * production credentials sitting in log storage. The host is kept because it is
 * needed to diagnose the failure; only the userinfo is removed.
 */
export function redactCredentials(text: string): string {
  return text.replace(/(mongodb(?:\+srv)?:\/\/)[^/\s@]*@/gi, '$1<redacted>@')
}

/**
 * Renders an unknown thrown value as a single redacted line.
 *
 * Logs the error class and code so a failure is still diagnosable, without
 * serialising the whole error object, whose shape varies by driver version and
 * can carry connection details.
 */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const code = (error as { code?: unknown }).code
    return redactCredentials(`${error.name}${code ? ` [${String(code)}]` : ''}: ${error.message}`)
  }
  return redactCredentials(String(error))
}
