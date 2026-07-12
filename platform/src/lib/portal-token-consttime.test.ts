import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Constant-time HMAC compare in portal token verify [fix fabd246].
 *
 * Both portal token verifiers replaced a plain `sig !== expected` string compare
 * (which short-circuits on the first differing byte and leaks the expected
 * signature via response timing) with a length-guarded crypto.timingSafeEqual.
 *
 * WHY THIS IS A SOURCE INVARIANT, NOT A BEHAVIORAL TEST:
 * The fix is not observable through return values. `sig !== expected` and the
 * constant-time compare return the SAME thing (null) for every input — the only
 * difference is timing, which is flaky to assert. Worse, verify() is wrapped in
 * try/catch, so even a wrong-length sig (which would make timingSafeEqual throw
 * without the length guard) is swallowed to null. The fix's own bundled tests
 * (token.test.ts) therefore stay green even if you revert the whole fix back to
 * `sig !== expected` — verified by hand: reverting kept all 6 bundled tests
 * passing. Output assertions cannot fix-proof this fix; a source invariant can.
 *
 * Trip wire: revert either verifier to `sig !== expected`, or drop the length
 * guard / missing-segment guard, and the matching assertion below fails.
 */

const TOKEN_FILES = [
  'src/app/api/portal/auth/token.ts',
  'src/app/api/team-portal/auth/token.ts',
]

describe('portal token verify — constant-time compare invariant [fabd246]', () => {
  for (const rel of TOKEN_FILES) {
    describe(rel, () => {
      const src = readFileSync(path.resolve(process.cwd(), rel), 'utf8')

      it('uses crypto.timingSafeEqual for the signature compare', () => {
        expect(src).toMatch(/crypto\.timingSafeEqual\s*\(/)
      })

      it('length-guards timingSafeEqual so a wrong-length sig cannot throw', () => {
        // The length check must short-circuit BEFORE timingSafeEqual (which
        // throws on unequal-length buffers). Assert the guard and the compare
        // live in the same `||` expression, length first.
        expect(src).toMatch(
          /\.length\s*!==\s*\w+\.length\s*\|\|\s*!crypto\.timingSafeEqual\s*\(/
        )
      })

      it('rejects a missing signature segment before Buffer.from', () => {
        // `if (!payloadB64 || !sig) return null` — without it, a token with no
        // '.' feeds Buffer.from(undefined) into the compare path.
        expect(src).toMatch(/if\s*\(\s*!payloadB64\s*\|\|\s*!sig\s*\)\s*return null/)
      })

      it('does NOT contain the vulnerable plain string compare', () => {
        // The exact pre-fix line. Its presence means the timing side-channel
        // is back.
        expect(src).not.toMatch(/if\s*\(\s*sig\s*!==\s*expected\s*\)/)
      })
    })
  }
})
