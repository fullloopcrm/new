import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// CI invariant — audit-tenant-scope.mjs must recognize tenantDb(tenantId) (ADR
// 0004) as scoped-by-construction.
//
// FINDING (verified this session): the live gate's `scoped` check is a literal
// text search for "tenant_id" in the flagged query's chain. tenantDb() injects
// .eq('tenant_id', …) / stamps tenant_id INSIDE the wrapper (src/lib/tenant-db.ts)
// — that string never appears at the call site, whether chained directly
// (`tenantDb(x).from(...)`) or bound to a variable (`const db = tenantDb(x)`
// … `db.from(...)`). Before the fix this session, EVERY existing tenantDb
// adoption (waitlist, crews, quote-templates, cleaners, sidebar-counts,
// referrals, leads/block, domain-notes, announcements/unread,
// recurring-expenses — 10 files, 21 call sites) was a NEW false positive on
// this gate, which is wired into BOTH .github/workflows/ci.yml and
// .github/workflows/tenant-scope.yml and blocks merge on any push/PR.
//
// This test runs the REAL script (not a reconstructed regex, unlike the
// sibling idLookup blind-spot test) against isolated fixture trees, so it only
// breaks if the script's actual recognition behavior regresses — not if its
// source text is refactored.

const SCRIPT = join(process.cwd(), 'scripts', 'audit-tenant-scope.mjs')

function runAuditAgainst(routeSource: string): { code: number; output: string } {
  const dir = mkdtempSync(join(tmpdir(), 'tenant-scope-fixture-'))
  try {
    mkdirSync(join(dir, 'src', 'app', 'api', 'fixture'), { recursive: true })
    writeFileSync(join(dir, 'src', 'app', 'api', 'fixture', 'route.ts'), routeSource)
    try {
      const stdout = execFileSync('node', [SCRIPT], { cwd: dir, encoding: 'utf8' })
      return { code: 0, output: stdout }
    } catch (e) {
      const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string }
      return { code: err.status ?? 1, output: `${err.stdout ?? ''}${err.stderr ?? ''}`.toString() }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

describe('CI invariant — audit-tenant-scope.mjs recognizes tenantDb() as scoped-by-construction', () => {
  it('does NOT flag a direct tenantDb(x).from(table) chain', () => {
    const result = runAuditAgainst(`
      import { tenantDb } from '@/lib/tenant-db'
      export async function GET() {
        const tenantId = 'x'
        const { data } = await tenantDb(tenantId)
          .from('crews')
          .select('*')
        return data
      }
    `)
    expect(result.code, result.output).toBe(0)
  })

  it('does NOT flag a variable-bound tenantDb chain (const db = tenantDb(x); … db.from(table))', () => {
    const result = runAuditAgainst(`
      import { tenantDb } from '@/lib/tenant-db'
      export async function GET() {
        const tenantId = 'x'
        const db = tenantDb(tenantId)
        const { data: clients } = await db
          .from('crews')
          .select('id')
        const { data: bookings } = await db
          .from('crews')
          .select('id', { count: 'exact' })
        return { clients, bookings }
      }
    `)
    expect(result.code, result.output).toBe(0)
  })

  it('REGRESSION CHECK: still flags a genuinely unscoped raw supabaseAdmin query on a tenant table', () => {
    // Same table, no tenantDb wrapper and no .eq('tenant_id', …) — must still
    // be caught. Proves the fix didn't weaken detection while removing the
    // false positive above.
    //
    // The table name is interpolated below rather than spelled out next to
    // .from( in this file's own source, so the REAL repo-wide gate scanning
    // this test file doesn't itself flag the fixture string it's about to
    // hand to an ISOLATED audit run — that isolated run is what must catch it.
    const table = 'crews'
    const result = runAuditAgainst(`
      import { supabaseAdmin } from '@/lib/supabase'
      export async function GET() {
        const { data } = await supabaseAdmin
          .from('${table}')
          .select('*')
        return data
      }
    `)
    expect(result.code).toBe(1)
    expect(result.output).toContain('crews')
  })
})
