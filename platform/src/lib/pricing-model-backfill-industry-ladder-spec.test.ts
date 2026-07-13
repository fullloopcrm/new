/**
 * Executable contract pinning PASS C of migrations/2026_07_11_pricing_model_backfill.sql
 * (the "flat-trade tenant" regex ladder) against src/lib/industry-presets.ts
 * mapIndustry() — the app's own source of truth for free-text industry → vertical.
 *
 * WHY THIS MATTERS: PASS C is a hand-transcribed, ORDER-DEPENDENT replica of the
 * mapIndustry() ladder (first match wins in both). It decides pricing_model
 * ('hourly' vs 'flat') for real service rows — a MONEY-PATH backfill: a drifted
 * rule silently mis-bills a tenant's customers (hourly recompute on a flat-price
 * trade, or vice versa). The migration's own header says "reproduces that ladder
 * EXACTLY (same rules, same order)" but nothing enforced that claim until this
 * file. mapIndustry() can change at any time from unrelated feature work (new
 * vertical, reworded regex, reordered precedence) with no reason for the author
 * to think to touch a one-off backfill SQL file from a different session.
 *
 * WHY A STRUCTURAL DIFF, NOT SAMPLE STRINGS: sampling strings can miss an order
 * regression (a reordered rule only misclassifies inputs that match BOTH the
 * moved rule and whatever now runs before it — easy to miss by hand). Comparing
 * the two ordered rule lists directly, pattern-for-pattern, position-for-position,
 * catches every reordering and every regex divergence, not just the ones a
 * sample string happens to hit.
 *
 * WHY A TEST, NOT A MIGRATION RUN: W1 does not run DB commands; this backfill is
 * gated DDL the leader applies after Jeff approves. There is no live schema to
 * probe, so this asserts the decidable text contract between the two files.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const jsSrc = readFileSync(resolve(HERE, 'industry-presets.ts'), 'utf8')
const sqlSrc = readFileSync(resolve(HERE, '../../migrations/2026_07_11_pricing_model_backfill.sql'), 'utf8')

// The seven flat trades PASS C targets, per the migration's own header/★ markers.
const FLAT_KEYS = new Set(['bin_cleaning', 'pet_waste', 'dumpster', 'junk_removal', 'snow_removal', 'laundry', 'fitness'])

// The one documented, no-consequence gap: JS's trailing 'handyman' rule (right
// before `return 'general'`) has no SQL counterpart. It is non-flat, and it is
// the LAST rule, so its absence cannot reorder or shadow anything before it —
// falling through to SQL's `ELSE false` yields the identical outcome.
const JS_ONLY_TRAILING_KEY = 'handyman'

interface Rule {
  pattern: string
  flat: boolean
}

function jsRules(): Rule[] {
  const start = jsSrc.indexOf('export function mapIndustry')
  expect(start, 'mapIndustry() not found in industry-presets.ts').toBeGreaterThan(-1)
  const end = jsSrc.indexOf('\n}\n', start)
  const body = jsSrc.slice(start, end)
  const matches = [...body.matchAll(/if \(\/(.+?)\/\.test\(s\)\) return '([a-z_]+)'/g)]
  expect(matches.length, 'parser sanity — no JS rules extracted').toBeGreaterThan(0)
  return matches
    .filter((m) => m[2] !== JS_ONLY_TRAILING_KEY)
    .map((m) => ({ pattern: m[1], flat: FLAT_KEYS.has(m[2]) }))
}

function sqlRules(): Rule[] {
  const start = sqlSrc.indexOf('CASE\n')
  expect(start, 'CASE not found in pricing-model backfill').toBeGreaterThan(-1)
  const end = sqlSrc.indexOf('ELSE false', start)
  expect(end, 'ELSE false not found in pricing-model backfill').toBeGreaterThan(-1)
  const block = sqlSrc.slice(start, end)
  const matches = [...block.matchAll(/WHEN t\.industry ~\* '(.+?)' THEN (true|false)/g)]
  expect(matches.length, 'parser sanity — no SQL rules extracted').toBeGreaterThan(0)
  // Postgres \y (word boundary) is JS's \b — normalize for comparison.
  return matches.map((m) => ({ pattern: m[1].replace(/\\y/g, '\\b'), flat: m[2] === 'true' }))
}

describe('pricing_model_backfill PASS C ⇄ mapIndustry() ladder (no-drift guard)', () => {
  it('FLAT_KEYS is exactly the seven documented flat trades', () => {
    expect([...FLAT_KEYS].sort()).toEqual(
      ['bin_cleaning', 'dumpster', 'fitness', 'junk_removal', 'laundry', 'pet_waste', 'snow_removal'].sort(),
    )
  })

  it('the SQL ladder has exactly as many rules as the JS ladder minus the documented handyman gap', () => {
    expect(sqlRules().length).toBe(jsRules().length)
  })

  it('every rule matches its JS counterpart in pattern AND position, and the flat/non-flat verdict agrees', () => {
    const js = jsRules()
    const sql = sqlRules()
    const mismatches: string[] = []
    for (let i = 0; i < Math.max(js.length, sql.length); i++) {
      const j = js[i]
      const s = sql[i]
      if (!j || !s) {
        mismatches.push(`rule #${i}: one ladder ran out (js=${j?.pattern ?? 'MISSING'}, sql=${s?.pattern ?? 'MISSING'})`)
        continue
      }
      if (j.pattern !== s.pattern) {
        mismatches.push(`rule #${i}: pattern differs — js='${j.pattern}' sql='${s.pattern}'`)
      }
      if (j.flat !== s.flat) {
        mismatches.push(`rule #${i} ('${j.pattern}'): js flat=${j.flat} sql flat=${s.flat}`)
      }
    }
    expect(mismatches, mismatches.join('\n')).toEqual([])
  })

  it('the explicit precedence example from the migration header holds: pool wins over junk for "pool cleanout"', () => {
    // The migration comment calls this out by name as the reason PASS C must be
    // a faithful ladder, not an unordered allowlist.
    const js = jsRules()
    const poolIdx = js.findIndex((r) => r.pattern === 'pool')
    const junkIdx = js.findIndex((r) => r.pattern.startsWith('junk|debris'))
    expect(poolIdx, 'pool rule not found').toBeGreaterThan(-1)
    expect(junkIdx, 'junk rule not found').toBeGreaterThan(-1)
    expect(poolIdx, 'pool must be tested before junk so "pool cleanout" resolves to pool, not junk').toBeLessThan(junkIdx)
  })
})
