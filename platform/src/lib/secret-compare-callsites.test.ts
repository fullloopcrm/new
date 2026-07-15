import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Constant-time secret compare hardening (P1/W1 queue-c).
 *
 * These sites compared a caller-supplied credential (admin PIN, monitor
 * key, internal API key, CRON_SECRET) against an env-configured secret with
 * plain `===`/`!==`, leaking the secret one byte at a time via response
 * timing — same class of bug already fixed for HMAC signatures elsewhere
 * (see portal-token-consttime.test.ts). Fix: route every compare through
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
  // Second batch: CRON_SECRET Bearer compares. `verifyCronSecret()` in
  // lib/cron-auth.ts is shared by 30+ cron/system routes, so fixing it alone
  // covers most callers -- these 9 standalone routes reimplement the check
  // inline instead of using the shared helper and needed their own fix.
  {
    file: 'src/lib/cron-auth.ts',
    vulnerable: /authHeader\s*!==\s*`Bearer \$\{secret\}`/,
  },
  {
    file: 'src/app/api/cron/finance-post/route.ts',
    vulnerable: /auth\s*!==\s*`Bearer \$\{process\.env\.CRON_SECRET\}`/,
  },
  {
    file: 'src/app/api/cron/jefe-heartbeat/route.ts',
    vulnerable: /auth\s*!==\s*`Bearer \$\{secret\}`/,
  },
  {
    file: 'src/app/api/cron/comms-monitor/route.ts',
    vulnerable: /auth\s*!==\s*`Bearer \$\{secret\}`/,
  },
  {
    file: 'src/app/api/cron/health-monitor/route.ts',
    vulnerable: /auth\s*!==\s*`Bearer \$\{secret\}`/,
  },
  {
    file: 'src/app/api/cron/recurring-expenses/route.ts',
    vulnerable: /auth\s*!==\s*`Bearer \$\{secret\}`/,
  },
  {
    file: 'src/app/api/indexnow/route.ts',
    vulnerable: /authHeader\s*===\s*`Bearer \$\{process\.env\.CRON_SECRET\}`/,
  },
  {
    file: 'src/app/api/admin/seo/apply/route.ts',
    vulnerable: /bearer\s*===\s*`Bearer \$\{secret\}`/,
  },
  // Third batch: SELENA_TEST_TOKEN compares, missed by the original queue-c
  // sweep. Both routes are 404-when-unset test harnesses, but when
  // SELENA_TEST_TOKEN IS configured (e.g. a shared parity-test environment),
  // a plain `!==` leaks the token one byte at a time via response timing.
  {
    file: 'src/app/api/test/email-selena/route.ts',
    vulnerable: /body\.key\s*!==\s*expectedToken/,
  },
  {
    file: 'src/app/api/test/email-selena/cleanup/route.ts',
    vulnerable: /body\.key\s*!==\s*expectedToken/,
  },
  // Fourth batch: protectCronAPI() (lib/nycmaid/auth.ts) — a SEPARATE
  // CRON_SECRET Bearer helper from verifyCronSecret()/lib/cron-auth.ts,
  // used by cron/{rating-prompt,refresh-job-postings,anthropic-health,
  // phone-fixup,confirmation-reminder} and missed by the original queue-c
  // sweep (which only covered the 9 standalone inline-compare routes).
  {
    file: 'src/lib/nycmaid/auth.ts',
    vulnerable: /authHeader\s*===\s*`Bearer \$\{cronSecret\}`/,
  },
  // Fifth batch: /api/admin-auth (global super-admin PIN gate, distinct from
  // /api/auth/login) — missed by the original queue-c sweep. `pin ===
  // ADMIN_PIN` leaked the platform god-mode PIN one byte at a time via
  // response timing; the route's own HMAC token verifies (verifyAdminToken/
  // verifyTenantAdminToken) already used crypto.timingSafeEqual, only the
  // raw PIN compare was left unguarded.
  {
    file: 'src/app/api/admin-auth/route.ts',
    vulnerable: /pin\s*===\s*ADMIN_PIN/,
  },
]

describe('constant-time secret compare invariant (queue-c)', () => {
  for (const { file, vulnerable } of CASES) {
    describe(file, () => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')

      it('imports the safeEqual helper', () => {
        // Allows either a bare `{ safeEqual }` import or a multi-named one
        // (e.g. `{ safeEqual, signWithSecret }`) from the same module.
        expect(src).toMatch(/import\s*\{[^}]*\bsafeEqual\b[^}]*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
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

describe('comhub-email + payment-followup-daily — x-vercel-cron bypass closed', () => {
  // Both routes used to OR an unauthenticated `x-vercel-cron: 1` header
  // (spoofable by any external caller — Vercel does not cryptographically
  // sign it) around the CRON_SECRET compare, and comhub-email additionally
  // accepted the secret via a `?secret=` query param (logged in access/proxy
  // logs). Both are now routed through the shared fail-closed
  // verifyCronSecret() helper (lib/cron-auth.ts), which has neither bypass.
  for (const file of [
    'src/app/api/cron/comhub-email/route.ts',
    'src/app/api/cron/payment-followup-daily/route.ts',
  ]) {
    it(`${file} routes auth through verifyCronSecret(), no x-vercel-cron/query-secret bypass`, () => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')
      expect(src).toMatch(/import\s*\{\s*verifyCronSecret\s*\}\s*from\s*['"]@\/lib\/cron-auth['"]/)
      expect(src).toMatch(/verifyCronSecret\s*\(/)
      expect(src).not.toMatch(/x-vercel-cron/)
      expect(src).not.toMatch(/searchParams\.get\(['"]secret['"]\)/)
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

describe('empty-key HMAC fallback closed — signWithSecret() throws instead of signing with a publicly-computable key', () => {
  // cron/phone-fixup keyed an HMAC with `process.env.ADMIN_PASSWORD || ''` —
  // an empty HMAC key is publicly computable, so with ADMIN_PASSWORD
  // unconfigured, anyone could mint a still-valid phone-fixup link for any
  // cleaner id with zero credentials. Same class as lib/nycmaid/auth.ts's
  // signToken()/hashPassword(), fixed the same way: signWithSecret() throws
  // on an unset secret instead of falling back to ''.
  //
  // team-portal/update-phone/route.ts had the identical pattern
  // (`process.env.ADMIN_PASSWORD || ''` + a plain `!==` compare) — a caller
  // could forge a token that rewrites any team member's phone. Leader
  // confirmed this signing-weakness fix is distinct from the gated
  // team_members.pin VISIBILITY boundary and cleared it for the same fix.
  it("cron/phone-fixup signs via signWithSecret(), no ADMIN_PASSWORD || '' fallback", () => {
    const file = 'src/app/api/cron/phone-fixup/route.ts'
    const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')
    expect(src).toMatch(/import\s*\{[^}]*\bsignWithSecret\b[^}]*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
    expect(src).toMatch(/signWithSecret\s*\(/)
    expect(src).not.toMatch(/process\.env\.ADMIN_PASSWORD\s*\|\|\s*['"]/)
    expect(src).not.toMatch(/createHmac\(/)
  })

  it("team-portal/update-phone signs via signWithSecret() + safeEqual(), no ADMIN_PASSWORD || '' fallback or plain !== compare", () => {
    const file = 'src/app/api/team-portal/update-phone/route.ts'
    const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')
    expect(src).toMatch(/import\s*\{[^}]*\bsignWithSecret\b[^}]*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
    expect(src).toMatch(/import\s*\{[^}]*\bsafeEqual\b[^}]*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
    expect(src).toMatch(/signWithSecret\s*\(/)
    expect(src).toMatch(/safeEqual\s*\(/)
    expect(src).not.toMatch(/process\.env\.ADMIN_PASSWORD\s*\|\|\s*['"]/)
    expect(src).not.toMatch(/createHmac\(/)
    expect(src).not.toMatch(/expected\s*!==\s*sig/)
  })

  // Fresh broad-hunt finding: the tenant-site admin/client-portal auth clones
  // under src/app/site/<tenant>/_lib/auth.ts (nyc-mobile-salon,
  // the-nyc-interior-designer, wash-and-fold-hoboken, wash-and-fold-nyc) each
  // had the identical `process.env.ADMIN_PASSWORD || ''` signToken() +
  // literal `|| 'fallback'` hashPassword() + plain `!==` signature compares —
  // same bug class as nycmaid/auth.ts. Any of these 4 tenant sites' admin
  // sessions, password hashes, and (where present) client sessions / cron
  // Bearer checks were forgeable with ADMIN_PASSWORD unconfigured. Fixed the
  // same way: signWithSecret() fails closed, safeEqual() for all compares.
  const TENANT_AUTH_FILES = [
    'src/app/site/nyc-mobile-salon/_lib/auth.ts',
    'src/app/site/the-nyc-interior-designer/_lib/auth.ts',
    'src/app/site/wash-and-fold-hoboken/_lib/auth.ts',
    'src/app/site/wash-and-fold-nyc/_lib/auth.ts',
  ]

  for (const file of TENANT_AUTH_FILES) {
    it(`${file} signs via signWithSecret() + safeEqual(), no ADMIN_PASSWORD || fallback or plain !== compare`, () => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')
      expect(src).toMatch(/import\s*\{[^}]*\bsignWithSecret\b[^}]*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
      expect(src).toMatch(/import\s*\{[^}]*\bsafeEqual\b[^}]*\}\s*from\s*['"]@\/lib\/secret-compare['"]/)
      expect(src).toMatch(/signWithSecret\s*\(/)
      expect(src).toMatch(/safeEqual\s*\(/)
      expect(src).not.toMatch(/process\.env\.ADMIN_PASSWORD\s*\|\|\s*['"]/)
      expect(src).not.toMatch(/createHmac\(/)
      expect(src).not.toMatch(/signToken\([^)]*\)\s*!==\s*signature/)
      expect(src).not.toMatch(/authHeader\s*===\s*`Bearer \$\{cronSecret\}`/)
    })
  }
})
