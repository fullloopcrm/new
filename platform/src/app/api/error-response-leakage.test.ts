import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guard: NO HTTP error response embeds a stack trace or a secret env value.
 *
 * Why this test exists (see deploy-prep/error-response-leakage-audit.md): today,
 * across every `src/app/api/**\/route.ts`, ZERO response constructors serialize
 * `.stack` or a `process.env.<secret>` value into the body. That is the correct
 * posture and it is easy to regress silently — one `NextResponse.json({ error:
 * e.stack })` added in a hurry ships a framework stack trace (file paths, and
 * sometimes secret-adjacent values) to an untrusted caller, with no visible
 * failure. This test scans the real route source and goes RED the moment such a
 * leak is introduced.
 *
 * SCOPE — what this DOES assert:
 *   • No `NextResponse.json(...)` / `Response.json(...)` / `new Response(...)`
 *     argument contains `.stack`.
 *   • None contains a reference to a known SECRET env var (`process.env.<NAME>`).
 *
 * SCOPE — what this deliberately does NOT assert (honest limits):
 *   • It does NOT flag Postgres `error.message` (schema leak) — that is the
 *     larger, still-open problem tracked in deploy-prep/error-info-leak-audit.md.
 *     Flagging it here would make this test RED against known-open work.
 *   • It is a STATIC check over DIRECT response construction. A stack routed
 *     through an intermediate variable or a helper would slip past it. No such
 *     indirection exists today; if it appears, this guard is not a substitute for
 *     the schema-leak remediation.
 *   • The Telegram webhook stack echo is OUT of scope: it is a `sendTelegram`
 *     chat-message argument, not an HTTP response body (audit GAP 3, MEDIUM).
 */

const API_DIR = path.join(process.cwd(), 'src', 'app', 'api')

// Secret-bearing env vars. A response body must never contain any of these
// values. Public config (NEXT_PUBLIC_*) is intentionally excluded — those ship
// to the browser by design. Kept in sync with deploy-prep/secrets-inventory-and-rotation-plan.md.
const SECRET_ENV: readonly string[] = [
  'SUPABASE_SERVICE_ROLE_KEY', 'FULLLOOP_SUPABASE_SERVICE_ROLE_KEY',
  'NYCMAID_SUPABASE_SERVICE_ROLE_KEY', 'NYCMAID_SERVICE_ROLE_KEY', 'FULLLOOP_DB_URL',
  'CLERK_SECRET_KEY', 'CLERK_WEBHOOK_SECRET',
  'ADMIN_TOKEN_SECRET', 'ADMIN_AUTH_SECRET', 'ADMIN_PASSWORD', 'ADMIN_PIN',
  'CRON_SECRET', 'PORTAL_SECRET', 'TEAM_PORTAL_SECRET', 'TENANT_HEADER_SIG_SECRET',
  'INGEST_SECRET', 'INTERNAL_API_KEY', 'SECRET_ENCRYPTION_KEY',
  'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PLATFORM_WEBHOOK_SECRET',
  'RESEND_API_KEY', 'RESEND_WEBHOOK_SECRET', 'NYCMAID_RESEND_KEY',
  'TELNYX_API_KEY', 'NYCMAID_TELNYX_KEY', 'ANTHROPIC_API_KEY',
  'TELEGRAM_BOT_TOKEN', 'JEFE_BOT_TOKEN', 'GOOGLE_CLIENT_SECRET', 'FACEBOOK_APP_SECRET',
  'VAPID_PRIVATE_KEY', 'GSC_SERVICE_ACCOUNT_JSON', 'SERPER_API_KEY', 'EMAIL_PASS',
  'VERCEL_API_TOKEN', 'VERCEL_DEPLOY_TOKEN', 'VERCEL_DEPLOY_HOOK_SECRET',
  'ELCHAPO_MONITOR_KEY', 'SELENA_TEST_TOKEN',
]

/** Matches the START of an HTTP-response construction (up to and incl. its `(`). */
const RESPONSE_START = /(?:\bNextResponse\.json\s*\(|\bResponse\.json\s*\(|\bnew\s+Response\s*\()/g

/**
 * Extract the argument text of each response construction, using a paren matcher
 * that skips string/template literals and comments so parens inside them don't
 * throw off the balance. Returns each argument span (between the opening `(` and
 * its matching `)`).
 */
function extractResponseArgs(src: string): string[] {
  const spans: string[] = []
  RESPONSE_START.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RESPONSE_START.exec(src)) !== null) {
    // exec ends just after the opening `(`.
    const open = RESPONSE_START.lastIndex - 1
    const span = readBalanced(src, open)
    if (span !== null) spans.push(span)
  }
  return spans
}

/** Read from an opening `(` at `open` to its matching `)`, string/comment-aware. */
function readBalanced(src: string, open: number): string | null {
  let depth = 0
  let i = open
  type Mode = 'code' | 'sq' | 'dq' | 'tpl' | 'line' | 'block'
  let mode: Mode = 'code'
  for (; i < src.length; i++) {
    const c = src[i]
    const n = src[i + 1]
    switch (mode) {
      case 'code':
        if (c === "'") mode = 'sq'
        else if (c === '"') mode = 'dq'
        else if (c === '`') mode = 'tpl'
        else if (c === '/' && n === '/') { mode = 'line'; i++ }
        else if (c === '/' && n === '*') { mode = 'block'; i++ }
        else if (c === '(') depth++
        else if (c === ')') { depth--; if (depth === 0) return src.slice(open + 1, i) }
        break
      case 'sq': if (c === '\\') i++; else if (c === "'") mode = 'code'; break
      case 'dq': if (c === '\\') i++; else if (c === '"') mode = 'code'; break
      case 'tpl': if (c === '\\') i++; else if (c === '`') mode = 'code'; break
      case 'line': if (c === '\n') mode = 'code'; break
      case 'block': if (c === '*' && n === '/') { mode = 'code'; i++ }; break
    }
  }
  return null // unbalanced — should not happen in valid source
}

/** Return the leak reasons found in a single response-argument span. */
function leaksIn(span: string): string[] {
  const reasons: string[] = []
  if (/\.stack\b/.test(span)) reasons.push('embeds ".stack"')
  for (const name of SECRET_ENV) {
    if (span.includes(`process.env.${name}`)) reasons.push(`embeds secret env process.env.${name}`)
  }
  return reasons
}

function walkRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walkRouteFiles(full))
    else if (entry.name === 'route.ts' || entry.name === 'route.tsx') out.push(full)
  }
  return out
}

describe('error-response leakage guard — no stack traces / secret env values in HTTP responses', () => {
  const files = fs.existsSync(API_DIR) ? walkRouteFiles(API_DIR) : []

  it('actually found the API route files to scan (guards against a vacuous pass)', () => {
    expect(fs.existsSync(API_DIR), `expected API dir at ${API_DIR}`).toBe(true)
    // The audit counted ~498 route files; assert we scanned a realistic surface,
    // not zero (which would make every assertion below trivially green).
    expect(files.length).toBeGreaterThan(100)
  })

  it('scanner sanity: it DOES flag a planted stack + secret leak', () => {
    const planted = `
      return NextResponse.json({ error: err.stack }, { status: 500 })
      return NextResponse.json({ key: process.env.STRIPE_SECRET_KEY })
    `
    const spans = extractResponseArgs(planted)
    const reasons = spans.flatMap(leaksIn)
    expect(reasons.some((r) => r.includes('.stack'))).toBe(true)
    expect(reasons.some((r) => r.includes('STRIPE_SECRET_KEY'))).toBe(true)
  })

  it('scanner sanity: it does NOT flag a clean response or a public env value', () => {
    const clean = `
      return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ url: process.env.NEXT_PUBLIC_APP_URL })
    `
    const reasons = extractResponseArgs(clean).flatMap(leaksIn)
    expect(reasons).toEqual([])
  })

  it('no route response embeds a stack trace or a secret env value', () => {
    const offenders: string[] = []
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8')
      for (const span of extractResponseArgs(src)) {
        const reasons = leaksIn(span)
        if (reasons.length > 0) {
          offenders.push(`${path.relative(process.cwd(), file)} — ${reasons.join('; ')}`)
        }
      }
    }
    expect(
      offenders,
      `HTTP error responses must not leak stack traces or secret env values. Offending routes:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
