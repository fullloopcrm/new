/**
 * Schema-drift regression guard.
 *
 * Codifies two findings from deploy-prep/schema-drift-register.md so they cannot
 * silently regress in application code. This test reads source as text (no DB, no
 * network) and enforces column-name discipline on the `clients` table.
 *
 * FINDING 1 — `clients.sms_opt_in` is a DEAD consent column.
 *   The opt-out flow writes `clients.sms_consent` (webhooks/telnyx STOP handler,
 *   nycmaid/sms.ts, selena/tools.ts). NOTHING writes `clients.sms_opt_in`. Any
 *   query that gates SMS on `sms_opt_in` therefore never sees an opt-out and texts
 *   opted-out clients. The one current offender is send-apology-batch (tracked by
 *   deploy-prep/sms-opt-out-bug-fix-spec.md). This guard prevents the pattern from
 *   SPREADING to new call sites while that fix is pending.
 *
 * FINDING 2 — `clients.status` is NOT phantom (register correction).
 *   The register labeled `clients.status` PHANTOM. That is wrong: schema.sql's
 *   `clients` CREATE TABLE defines `status`, and src/app/api/clients/route.ts WRITES
 *   it on every insert (an insert to a missing column would 500, not fail silently).
 *   This test encodes the corrected truth so nobody codifies a false "status is
 *   phantom" ban that would break the client create/update paths.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(process.cwd(), 'src')

function walkTsFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue
      out.push(...walkTsFiles(full))
    } else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

/**
 * A line references the `clients.sms_opt_in` COLUMN if it accesses it as a property
 * (`c.sms_opt_in`) or names it inside a `.select(...)`. It does NOT count the two
 * legitimate uses of `'sms_opt_in'` as a notification TYPE string
 * (notify.ts union member, telnyx `type: 'sms_opt_in'`), which are quoted literals.
 */
function referencesSmsOptInColumn(line: string): boolean {
  if (/\.sms_opt_in\b/.test(line)) return true
  if (/select\([^)]*\bsms_opt_in\b/i.test(line)) return true
  return false
}

// The two known sites that read the dead `clients.sms_opt_in` column. Both must be
// switched to `sms_consent` (see deploy-prep/sms-opt-out-bug-fix-spec.md); delete each
// entry as it is fixed so the guard tightens toward strict-zero.
//   1. send-apology-batch — SEND bug: opted-out clients get texted (TCPA risk).
//   2. dashboard/clients/[id] — DISPLAY bug: operator sees "SMS Opt-in: Yes" for a
//      client who texted STOP (sms_consent=false), because the UI reads the dead column.
const KNOWN_OFFENDERS = [
  'src/app/api/admin/send-apology-batch/route.ts',
  'src/app/dashboard/clients/[id]/page.tsx',
]

describe('schema-drift guard — clients.sms_opt_in is a dead column', () => {
  const files = walkTsFiles(SRC)

  it('scans a non-empty source tree', () => {
    expect(files.length).toBeGreaterThan(100)
  })

  it('has NO new clients.sms_opt_in column references beyond the known bug site', () => {
    const offenders: string[] = []
    for (const file of files) {
      const rel = path.relative(process.cwd(), file)
      const lines = readFileSync(file, 'utf8').split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (referencesSmsOptInColumn(lines[i])) offenders.push(`${rel}:${i + 1}`)
      }
    }
    const unexpected = offenders.filter(
      (o) => !KNOWN_OFFENDERS.some((k) => o.startsWith(k)),
    )
    // Any NEW file gating SMS on the dead sms_opt_in column is a regression.
    expect(unexpected).toEqual([])
  })
})

describe('schema-drift guard — clients.status is a REAL column (register correction)', () => {
  it('schema.sql defines status AND sms_opt_in on the clients table', () => {
    const schema = readFileSync(
      path.resolve(process.cwd(), 'supabase/schema.sql'),
      'utf8',
    )
    const match = schema.match(/CREATE TABLE clients \(([\s\S]*?)\n\);/)
    expect(match, 'clients CREATE TABLE block not found in schema.sql').toBeTruthy()
    const block = match![1]
    // Both are foundation columns — proving clients.status is not phantom.
    expect(block).toMatch(/\bstatus\b/)
    expect(block).toMatch(/\bsms_opt_in\b/)
  })

  it('the client write path sets clients.status (would 500 if the column were absent)', () => {
    const route = readFileSync(
      path.resolve(process.cwd(), 'src/app/api/clients/route.ts'),
      'utf8',
    )
    expect(route).toMatch(/fields\.status\s*=/)
  })
})
