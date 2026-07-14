import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * LIKE-wildcard-injection regression (sibling class to the `.or()` injection
 * covered by postgrest-injection-routes.test.ts, which only sweeps `.or()`
 * call sites and explicitly does NOT touch this one).
 *
 * sanitizePostgrestValue() deliberately preserves `%`/`_` for its own
 * call sites (intentional `%term%` substring search). But several routes use
 * `.ilike('column', value)` as an EXACT-MATCH, case-insensitive lookup with
 * no `%` wrapper of their own — there, a caller-controlled `%`/`_` doesn't
 * broaden an intentional search, it changes matching semantics entirely.
 * Confirmed exploitable pre-fix:
 *   - GET /api/client/check and GET /api/referrers?email= returned another
 *     person's name/phone/email/referral_code to an anonymous caller who
 *     supplied a `%`-pattern instead of a real address.
 *   - POST /api/client/book resolved `body.email` against `clients` via
 *     ilike — a wildcard could attach a new, attacker-controlled booking to
 *     an EXISTING client's account instead of creating a new one.
 *   - POST /api/referrers/auth/request could be made to email a real OTP
 *     login code to an unrelated referrer matched by wildcard.
 *   - POST /api/pin-reset (send_code / verify_and_set) used a wildcard-driven
 *     match as an account-existence oracle.
 *
 * escapeLikeValue() (src/lib/postgrest-safe.ts) neutralizes `%`, `_`, `\`
 * before these values reach `.ilike()`. This file proves every one of those
 * exact-match `.ilike('email', ...)` call sites is actually sanitizer-sourced
 * — a route that reverts to the raw variable passes every other test in its
 * own suite but reopens the leak.
 */

// Every file in this list has ONLY exact-match .ilike() call sites (verified
// by inspection — no `%term%` substring-search .ilike() lives in any of
// them), so it's safe to require every .ilike() call in the file to be
// escapeLikeValue-sourced without a per-column filter.
const FILES = [
  'src/app/api/client/check/route.ts',
  'src/app/api/client/book/route.ts',
  'src/app/api/referrers/route.ts',
  'src/app/api/referrers/auth/request/route.ts',
  'src/app/api/referrers/auth/verify/route.ts',
  'src/app/api/pin-reset/route.ts',
  'src/lib/inbound-email-tenant.ts',
]

function ilikeCalls(src: string): string[] {
  const out: string[] = []
  const re = /\.ilike\(\s*[^,]+,\s*([^)]*)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) out.push(m[1].trim())
  return out
}

describe('source invariant: every exact-match .ilike() call is escapeLikeValue-sourced', () => {
  for (const file of FILES) {
    it(file, () => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8')
      expect(src, 'file must import escapeLikeValue').toContain('escapeLikeValue')

      const calls = ilikeCalls(src)
      expect(calls.length, 'expected at least one .ilike() call site').toBeGreaterThan(0)

      for (const arg of calls) {
        expect(arg, `unsanitized .ilike() 2nd arg \`${arg}\` in ${file}`).toContain('escapeLikeValue(')
      }
    })
  }
})
