import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * Rate-limiter fail-CLOSED wiring for auth-critical callers [fix 038428f].
 *
 * rateLimitDb() failed OPEN on a count-query error, so a DB outage silently
 * disabled every throttle — including credential/OTP/PIN endpoints — handing an
 * attacker unlimited brute-force attempts. The fix added an opt-in
 * `{ failClosed: true }` flag and flipped the 9 auth-critical callers to it,
 * while public forms/telemetry keep the default fail-open so a transient blip
 * doesn't 429 legitimate traffic.
 *
 * rate-limit-db.test.ts already proves the MECHANISM fix-proof: with the flag,
 * a DB error denies; without it, a DB error allows. The gap THIS file closes is
 * that each of the 9 auth callers actually PASSES the flag — a route reverting
 * to a bare rateLimitDb(...) (fail-open) passes every existing test but is
 * brute-forceable again the moment the DB hiccups. It also pins that the public
 * callers stay fail-open, so an over-correction to blanket failClosed (which
 * would 429 public forms on any DB blip) is also caught.
 *
 * Trip wire: drop `failClosed: true` from any auth caller below → its assertion
 * fails. Add it to a public caller → that assertion fails.
 */

// The 9 auth-critical callers the fix flipped to fail-closed. Each must pass
// { failClosed: true } on its rateLimitDb call.
const AUTH_CALLERS = [
  'src/app/api/admin-auth/route.ts',
  'src/app/api/portal/auth/route.ts',
  'src/app/api/team-portal/auth/route.ts',
  'src/app/api/client/send-code/route.ts',
  'src/app/api/client/verify-code/route.ts',
  'src/app/api/client/login/route.ts',
  'src/app/api/pin-reset/route.ts',
  'src/app/api/referrers/auth/request/route.ts',
  'src/app/api/referrers/auth/verify/route.ts',
]

// A representative sample of public callers that must STAY fail-open (no flag).
const PUBLIC_CALLERS = [
  'src/app/api/apply/route.ts',
  'src/app/api/contact/route.ts',
  'src/app/api/lead/route.ts',
  'src/app/api/track/route.ts',
  'src/app/api/reviews/submit/route.ts',
]

// Full call sites that actually invoke the limiter (excludes the import and
// any comment referencing the symbol) — captures the whole balanced-paren
// argument list, not just the first line, since some callers wrap a long
// options object onto its own line (e.g. `rateLimitDb(key, n, ms, {\n
// failClosed: true,\n})`), which a single-line regex would miss entirely.
function rateLimitCalls(src: string): string[] {
  const calls: string[] = []
  const re = /rateLimitDb\s*\(/g
  let m: RegExpExecArray | null
  while ((m = re.exec(src))) {
    const lineStart = src.lastIndexOf('\n', m.index) + 1
    const linePrefix = src.slice(lineStart, m.index).trimStart()
    if (linePrefix.startsWith('*') || linePrefix.startsWith('//')) continue

    let depth = 0
    let i = src.indexOf('(', m.index)
    const start = i
    for (; i < src.length; i++) {
      if (src[i] === '(') depth++
      else if (src[i] === ')') {
        depth--
        if (depth === 0) { i++; break }
      }
    }
    calls.push(src.slice(start, i))
  }
  return calls
}

describe('rate-limit fail-closed caller invariant [038428f]', () => {
  it('all 9 auth callers exist and the list is exactly 9', () => {
    expect(AUTH_CALLERS.length).toBe(9)
  })

  describe('auth-critical callers pass { failClosed: true }', () => {
    for (const rel of AUTH_CALLERS) {
      it(rel, () => {
        const src = readFileSync(path.resolve(process.cwd(), rel), 'utf8')
        const calls = rateLimitCalls(src)
        expect(calls.length).toBeGreaterThan(0)
        // Every rateLimitDb call in an auth route must be fail-closed.
        for (const call of calls) {
          expect(call).toMatch(/failClosed:\s*true/)
        }
      })
    }
  })

  describe('public callers stay fail-open (no failClosed flag)', () => {
    for (const rel of PUBLIC_CALLERS) {
      it(rel, () => {
        const src = readFileSync(path.resolve(process.cwd(), rel), 'utf8')
        const calls = rateLimitCalls(src)
        expect(calls.length).toBeGreaterThan(0)
        for (const call of calls) {
          expect(call).not.toMatch(/failClosed/)
        }
      })
    }
  })
})
