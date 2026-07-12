import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Constant-time secret compare hardening (P1/W1 queue-c).
 *
 * These 5 sites compared a caller-supplied credential (admin PIN, monitor
 * key, internal API key) against an env-configured secret with plain
 * `===`/`!==`, leaking the secret one byte at a time via response timing —
 * same class of bug already fixed for HMAC signatures elsewhere (see
 * portal-token-consttime.test.ts). Fix: route every compare through
 * `safeEqual()` (length-guarded crypto.timingSafeEqual, lib/secret-compare.ts).
 *
 * Source invariant, not a behavioral test, for the same reason as the sibling
 * portal-token file: a plain compare and a constant-time compare return the
 * identical boolean for every input — only timing differs, which is flaky to
 * assert directly. So this asserts the vulnerable literal pattern is gone and
 * the safe helper is actually wired in, per file.
 */

const CASES: Array<{ file: string; vulnerable: RegExp }> = [
  {
    file: 'src/app/api/auth/login/route.ts',
    vulnerable: /if\s*\(\s*password\s*===\s*adminPassword\s*\)/,
  },
  {
    file: 'src/app/api/admin/selena/monitor/route.ts',
    vulnerable: /return\s+key\s*===\s*expected/,
  },
  {
    file: 'src/app/api/admin/payments/finalize-match/route.ts',
    vulnerable: /internalKey\s*!==\s*expected/,
  },
  {
    file: 'src/app/api/admin/selena/sms-status/route.ts',
    vulnerable: /monitorKey\s*===\s*process\.env\.ELCHAPO_MONITOR_KEY/,
  },
  {
    file: 'src/app/api/email/monitor/route.ts',
    vulnerable: /key\s*===\s*process\.env\.ELCHAPO_MONITOR_KEY/,
  },
]

describe('constant-time secret compare invariant (queue-c)', () => {
  for (const { file, vulnerable } of CASES) {
    describe(file, () => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')

      it('imports the safeEqual helper', () => {
        expect(src).toMatch(/import\s*\{\s*safeEqual\s*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
      })

      it('routes the secret compare through safeEqual(...)', () => {
        expect(src).toMatch(/safeEqual\s*\(/)
      })

      it('does NOT contain the vulnerable plain-string compare', () => {
        expect(src).not.toMatch(vulnerable)
      })
    })
  }
})

describe('auth/login — unconfigured ADMIN_PASSWORD no longer grants access on empty password', () => {
  // Prior bug (same line as the timing fix): adminPassword defaulted to ''
  // via `(process.env.ADMIN_PASSWORD || '').trim()`, so an unconfigured
  // ADMIN_PASSWORD made `password === adminPassword` true for an EMPTY
  // submitted password — a full admin-auth bypass with no env var set.
  // safeEqual() rejects empty/falsy operands outright, but only if the
  // route no longer coerces the missing env var to ''.
  it('adminPassword is not coerced to an empty string when unset', () => {
    const src = readFileSync(
      path.resolve(process.cwd(), 'src/app/api/auth/login/route.ts'),
      'utf8'
    )
    expect(src).not.toMatch(/\(process\.env\.ADMIN_PASSWORD\s*\|\|\s*['"]{2}\)\.trim\(\)/)
  })
})
