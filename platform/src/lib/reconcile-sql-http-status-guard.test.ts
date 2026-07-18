import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// CI invariant guard (W3 lane: reconcile gate + CI wiring). Item (232), fresh
// ground continuing item (231)'s surface (the reconcile gate's own sql()
// helper in scripts/reconcile-tenant-config.mjs): (231) bounded the fetch()
// call's HANG risk with an AbortSignal timeout. This guard covers the
// sibling gap in the SAME helper, on the RESPONSE side rather than the
// request side: sql() called r.json() unconditionally, with no check of
// r.ok/r.status first.
//
// api.supabase.com can return a non-2xx response for reasons that have
// nothing to do with a real drift bug -- an expired/rotated
// SUPABASE_ACCESS_TOKEN_FULLLOOP (401), a rate limit (429), or a plain
// upstream outage (5xx, and a 5xx from a gateway in front of that API can
// come back as an HTML error page, not JSON). Falling straight into
// r.json() on that path throws a bare, opaque SyntaxError ("Unexpected
// token '<'...") with no HTTP status and no indication of which of this
// gate's up-to-5 per-run queries failed. For a merge-blocking CI gate, that
// is the wrong failure shape: a human triaging a red PR check sees a raw
// stack trace that looks identical whether the cause is "Supabase token
// expired" or "this PR introduced a real routing drift bug" -- exactly the
// ambiguity a fast, actionable failure message exists to remove.
//
// Mutation-verified before writing the fix: this test, run against the
// pre-fix sql() (bare `await r.json()`, no `r.ok` check, and the
// `!Array.isArray(d)` branch's error message carrying no query text), fails
// on both the missing-status-check assertion and the missing-query-context
// assertion. Fixed by checking `r.ok` first (throwing a message that
// includes r.status/r.statusText/the query text/a slice of the response
// body) and by adding the query text to the pre-existing
// `!Array.isArray(d)` error too. Mutation-verified again after the fix:
// reverting either the `if (!r.ok)` block or the query-text interpolation in
// the `!Array.isArray(d)` message -- guard caught each independently,
// restored clean, `git diff --stat platform/scripts/reconcile-tenant-config.mjs`
// unchanged before and after the round-trip.
//
// PURE SOURCE-READING of the script -- no network, no DB, same approach as
// reconcile-sql-fetch-timeout-guard.test.ts (item (231)'s own guard) and
// every other guard in this lane. vitest runs with the platform package root
// as cwd, so the script lives at scripts/reconcile-tenant-config.mjs.

const SCRIPT_PATH = join(process.cwd(), 'scripts', 'reconcile-tenant-config.mjs')

function scriptSource(): string {
  return readFileSync(SCRIPT_PATH, 'utf8')
}

function sqlHelperBlock(source: string): string {
  const m = source.match(/const sql = async \(query\) => \{[\s\S]*?\n  \}/)
  expect(m, 'could not locate the sql() helper block in reconcile-tenant-config.mjs').not.toBeNull()
  return m![0]
}

describe('CI invariant — reconcile-tenant-config.mjs\'s sql() helper reports HTTP failures clearly, not as an opaque parse error', () => {
  it('the reconcile script exists where the guard expects it', () => {
    expect(existsSync(SCRIPT_PATH), `no reconcile script at ${SCRIPT_PATH}`).toBe(true)
  })

  it('the sql() helper still exists (the surface it protects is not deleted or renamed)', () => {
    expect(sqlHelperBlock(scriptSource())).not.toBeNull()
  })

  it('checks r.ok BEFORE calling r.json() (a non-2xx response is not fed straight into JSON parsing)', () => {
    const block = sqlHelperBlock(scriptSource())
    const okCheckIdx = block.search(/if\s*\(\s*!r\.ok\s*\)/)
    const jsonCallIdx = block.search(/const d = await r\.json\(\)/)
    expect(
      okCheckIdx !== -1,
      "reconcile-tenant-config.mjs's sql() helper no longer checks `r.ok` before " +
        'parsing the response as JSON -- a non-2xx response from api.supabase.com ' +
        '(expired token, rate limit, or a 5xx outage returning an HTML error page) ' +
        'now throws an opaque SyntaxError from r.json() instead of a clear ' +
        'HTTP-status-and-query error, making an auth/outage failure indistinguishable ' +
        'from a real drift-query bug in the CI log.',
    ).toBe(true)
    expect(
      jsonCallIdx !== -1 && okCheckIdx !== -1 && okCheckIdx < jsonCallIdx,
      "reconcile-tenant-config.mjs's sql() helper checks r.ok AFTER already calling " +
        'r.json() -- the check must run BEFORE the JSON parse to prevent a non-JSON ' +
        'error body from throwing an opaque parse error first.',
    ).toBe(true)
  })

  it('the r.ok failure message includes the HTTP status (r.status/r.statusText)', () => {
    const block = sqlHelperBlock(scriptSource())
    expect(
      /if\s*\(\s*!r\.ok\s*\)[\s\S]*?r\.status/.test(block) && /if\s*\(\s*!r\.ok\s*\)[\s\S]*?r\.statusText/.test(block),
      "reconcile-tenant-config.mjs's sql() helper's r.ok failure branch no longer " +
        'includes r.status/r.statusText in its thrown error -- a triager reading a ' +
        'red CI run would see no HTTP status at all, unable to tell an expired-token ' +
        '401 from a rate-limited 429 from a 5xx outage.',
    ).toBe(true)
  })

  it('every thrown SQL error (the r.ok branch AND the !Array.isArray branch) includes the query text', () => {
    const block = sqlHelperBlock(scriptSource())
    const throwLines = block.match(/throw new Error\([\s\S]*?\)/g) || []
    expect(
      throwLines.length,
      'sql() helper has no throw new Error(...) calls at all -- the error-reporting surface this guard protects is gone.',
    ).toBeGreaterThan(0)
    for (const line of throwLines) {
      expect(
        /query\.slice\(/.test(line),
        `sql() helper's thrown error does not interpolate the query text (${line.trim()}) -- with up to 5 ` +
          'distinct queries per run, an error with no query context leaves a triager unable to tell ' +
          'which of the 5 calls actually failed.',
      ).toBe(true)
    }
  })
})
