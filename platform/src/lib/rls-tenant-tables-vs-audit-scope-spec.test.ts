/**
 * Executable contract pinning 2026_07_11_rls_tenant_tables.sql's static
 * `tenant_tables` array against scripts/audit-tenant-scope.mjs's `TENANT_TABLES`
 * set — the two lists that MUST stay in sync for RLS to actually backstop every
 * lane's tenantDb()/`.eq('tenant_id', …)` app-layer isolation.
 *
 * WHY THIS MATTERS ACROSS LANES: every other lane's tenantDb() conversion is
 * audited against TENANT_TABLES (the app-layer gate). This migration's array is
 * the DB-layer backstop for the exact same table set. If a future PR adds a new
 * tenant-scoped table to TENANT_TABLES (required for the app-layer gate to cover
 * it) but forgets this migration's array — or vice versa — the new table's RLS
 * backstop silently never gets applied, and nothing before this test would catch
 * it: the migration is gated DDL W1 never runs, so there's no live schema to
 * probe. This asserts the decidable text contract between the two files on disk,
 * mirroring the pattern already used by tenant-domains-routing-spec.test.ts for
 * the middleware.ts ⇄ 055 backfill pair.
 *
 * WHY A TEST, NOT A MIGRATION RUN: W1 does not run DB commands; this migration
 * is gated DDL the leader applies after Jeff approves.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const auditSrc = readFileSync(resolve(HERE, '../../scripts/audit-tenant-scope.mjs'), 'utf8')
const migrationSrc = readFileSync(resolve(HERE, 'migrations/2026_07_11_rls_tenant_tables.sql'), 'utf8')

function tablesIn(block: string): string[] {
  return [...block.matchAll(/'([a-z][a-z0-9_]*)'/g)].map((m) => m[1])
}

function auditTenantTables(): Set<string> {
  const start = auditSrc.indexOf('TENANT_TABLES = new Set([')
  expect(start, 'TENANT_TABLES set not found in audit-tenant-scope.mjs').toBeGreaterThan(-1)
  const end = auditSrc.indexOf('])', start)
  return new Set(tablesIn(auditSrc.slice(start, end)))
}

function migrationTenantTables(): Set<string> {
  const start = migrationSrc.indexOf('tenant_tables text[] := ARRAY[')
  expect(start, 'tenant_tables ARRAY[ not found in migration').toBeGreaterThan(-1)
  const end = migrationSrc.indexOf('];', start)
  return new Set(tablesIn(migrationSrc.slice(start, end)))
}

// The 3 policies 046_rls_deny_on_new_tables.sql deliberately keeps deny-all —
// TENANT_TABLES includes them (they carry tenant_id) but the RLS migration must
// NOT add a permissive tenant_isolation policy for them.
const DENY_ALL = ['verification_codes', 'portal_auth_codes', 'impersonation_events']

// Tables the migration adds beyond TENANT_TABLES on purpose — they already carry
// a USING-only tenant_isolation policy from 2026_07_11_enable_rls_gap_tables.sql
// and this migration re-emits them to add WITH CHECK. Documented in the
// migration's own "NOTE resale_assets / tenant_health / year_end_runs" comment.
// A change here is a deliberate, reviewable edit — not silent drift.
const DOCUMENTED_EXTRA = ['resale_assets', 'tenant_health', 'year_end_runs']

describe('RLS migration tenant_tables ⇄ audit-tenant-scope TENANT_TABLES (no-drift guard)', () => {
  it('parser sanity — neither list is empty', () => {
    expect(auditTenantTables().size).toBeGreaterThan(0)
    expect(migrationTenantTables().size).toBeGreaterThan(0)
  })

  it('every TENANT_TABLES entry (minus the deny-all trio) is covered by the migration array', () => {
    const audit = auditTenantTables()
    const migration = migrationTenantTables()
    const expected = [...audit].filter((t) => !DENY_ALL.includes(t))
    const missing = expected.filter((t) => !migration.has(t))
    expect(missing, 'tables in TENANT_TABLES but missing from the RLS migration array').toEqual([])
  })

  it('the migration array contains no table beyond TENANT_TABLES except the documented extras', () => {
    const audit = auditTenantTables()
    const migration = migrationTenantTables()
    const unexplained = [...migration].filter((t) => !audit.has(t) && !DOCUMENTED_EXTRA.includes(t))
    expect(unexplained, 'tables in the RLS migration array but not in TENANT_TABLES and not documented').toEqual([])
  })

  it('the deny-all trio never appears in the migration array (would silently weaken deny-all to permissive)', () => {
    const migration = migrationTenantTables()
    for (const t of DENY_ALL) {
      expect(migration.has(t), `${t} must not carry a permissive tenant_isolation policy`).toBe(false)
    }
  })

  it('the documented-extra tables are genuinely absent from TENANT_TABLES (transcription sanity)', () => {
    const audit = auditTenantTables()
    for (const t of DOCUMENTED_EXTRA) {
      expect(audit.has(t), `${t} is expected to be absent from TENANT_TABLES per the migration's own note`).toBe(false)
    }
  })
})
