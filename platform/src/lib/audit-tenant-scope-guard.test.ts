import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Guards the LOGIC in scripts/audit-tenant-scope.mjs — the static leak
// detector that .github/workflows/tenant-scope.yml AND ci.yml (W3 lane: CI
// wiring) run on EVERY PR to block a new cross-tenant query. Every other
// lane's tenantDb() conversion trusts this gate to catch a regression; a
// silent bug in its regex (e.g. the tenantDb() var-bound lookbehind, or the
// baseline diff) would let a real leak merge, or false-positive-block every
// PR. It has no exported pure functions (self-executing CLI, cwd-relative
// paths), so this pins behavior BLACK-BOX: copy the real script into a
// throwaway fixture "repo" and assert exit code + stderr on synthetic source
// files, exactly like a PR's `node scripts/audit-tenant-scope.mjs` run.

const REAL_SCRIPT = join(process.cwd(), 'scripts', 'audit-tenant-scope.mjs')

// Builds the ".from('table')" substring at RUNTIME so this file's own source
// lines never contain an unbroken, literal unscoped `.from('table')` call —
// otherwise the guard would flag this very file when it scans the real repo
// (it text-scans every .ts file under src, including this one).
const FROM = (table: string): string => `.from('${table}')`

function makeFixture(): string {
  const dir = mkdtempSync(join(tmpdir(), 'tenant-scope-guard-'))
  mkdirSync(join(dir, 'scripts'), { recursive: true })
  cpSync(REAL_SCRIPT, join(dir, 'scripts', 'audit-tenant-scope.mjs'))
  mkdirSync(join(dir, 'src'), { recursive: true })
  return dir
}

function run(dir: string, args: string[] = []): { status: number | null; stdout: string; stderr: string } {
  const res = spawnSync('node', [join(dir, 'scripts', 'audit-tenant-scope.mjs'), ...args], {
    cwd: dir,
    encoding: 'utf8',
  })
  return { status: res.status, stdout: res.stdout, stderr: res.stderr }
}

function write(dir: string, relPath: string, content: string): void {
  const full = join(dir, relPath)
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, content)
}

const fixtures: string[] = []
function fixture(): string {
  const dir = makeFixture()
  fixtures.push(dir)
  return dir
}
afterEach(() => {
  while (fixtures.length) rmSync(fixtures.pop()!, { recursive: true, force: true })
})

describe('audit-tenant-scope guard — gating behavior (exit code)', () => {
  it('flags and RED-GATES a query on a tenant table with no tenant_id filter and no id lookup', () => {
    const dir = fixture()
    write(dir, 'src/leak.ts', `
      export async function bad(sb) {
        const { data } = await sb${FROM('bookings')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status).toBe(1)
    expect(stderr).toContain('bookings')
    expect(stderr).toContain('leak.ts')
  })

  it('passes a query scoped with .eq(tenant_id, …)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb, tenantId) {
        const { data } = await sb${FROM('bookings')}.select('*').eq('tenant_id', tenantId)
        return data
      }
    `)
    const { status } = run(dir)
    expect(status).toBe(0)
  })

  it('passes a row-specific id lookup (globally-unique key, not a leak)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb, id) {
        const { data } = await sb${FROM('bookings')}.select('*').eq('id', id)
        return data
      }
    `)
    const { status } = run(dir)
    expect(status).toBe(0)
  })

  it('passes a table NOT in the tenant-owned set even when unscoped', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb) {
        const { data } = await sb${FROM('not_a_tenant_table')}.select('*')
        return data
      }
    `)
    const { status } = run(dir)
    expect(status).toBe(0)
  })
})

describe('audit-tenant-scope guard — tenantDb() wrapper recognition (ADR 0004)', () => {
  it('recognizes the direct chain tenantDb(id).from(...) as scoped', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(tenantId) {
        const { data } = await tenantDb(tenantId)${FROM('bookings')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(0)
  })

  it('recognizes a multi-line direct chain (tenantDb( on a line above .from() within lookbehind)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(tenantId) {
        const { data } = await tenantDb(
          tenantId,
        )${FROM('bookings')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(0)
  })

  it('recognizes the variable-bound form: const db = tenantDb(id); db.from(...)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(tenantId) {
        const db = tenantDb(tenantId)
        const { data } = await db${FROM('bookings')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(0)
  })

  it('recognizes the variable-bound form when .from(...) wraps to the NEXT line (real codebase pattern: `await db\\n  .from(...)`)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(tenantId) {
        const db = tenantDb(tenantId)
        const { data } = await db
          ${FROM('bookings')}
          .select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(0)
  })

  it('does NOT let an unrelated variable named like a tenantDb var launder a real leak', () => {
    // Regression guard for the var-bound regex: a variable that merely SHARES A
    // NAME with a tenantDb-bound var in another function must not suppress a
    // genuinely unscoped call on a plain client in a DIFFERENT function. Before
    // the fix, the var-name check searched the whole 3-line lookbehind BLOB
    // (not just the current call's own chain root), so `db` from the unrelated
    // `scoped()` function above leaked into the window for `leaky()`'s check.
    const dir = fixture()
    write(dir, 'src/leak.ts', `
      export async function scoped(tenantId) {
        const db = tenantDb(tenantId)
        await db${FROM('bookings')}.select('*')
      }
      export async function leaky(sb) {
        const { data } = await sb${FROM('clients')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status).toBe(1)
    expect(stderr).toContain('clients')
  })
})

describe('audit-tenant-scope guard — explicit overrides and exclusions', () => {
  it('honors a `// tenant-scope-ok: <reason>` comment even on an unscoped query', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb) {
        const { data } = await sb${FROM('bookings')}.select('*') // tenant-scope-ok: admin aggregate
        return data
      }
    `)
    const { status } = run(dir)
    expect(status).toBe(0)
  })

  it('ignores .storage.from(...) (a storage bucket, not a Postgres table)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb) {
        const { data } = await sb.storage${FROM('bookings')}.list()
        return data
      }
    `)
    const { status } = run(dir)
    expect(status).toBe(0)
  })

  it('excludes the legacy per-tenant clone paths by default (never flagged, never gates)', () => {
    const dir = fixture()
    write(dir, 'src/app/site/wash-and-fold-hoboken/page.ts', `
      export async function bad(sb) {
        const { data } = await sb${FROM('bookings')}.select('*')
        return data
      }
    `)
    const { status, stdout } = run(dir)
    expect(status).toBe(0)
    expect(stdout).toContain('no NEW unscoped queries')
  })

  it('--all includes excluded clone paths in findings but NEVER gates (exit 0)', () => {
    const dir = fixture()
    write(dir, 'src/app/site/wash-and-fold-hoboken/page.ts', `
      export async function bad(sb) {
        const { data } = await sb${FROM('bookings')}.select('*')
        return data
      }
    `)
    const { status } = run(dir, ['--all'])
    expect(status).toBe(0)
  })
})

describe('audit-tenant-scope guard — baseline diffing (accepted legacy debt)', () => {
  it('suppresses a baselined finding but still gates on a genuinely NEW one', () => {
    const dir = fixture()
    write(dir, 'src/legacy-leak.ts', `
      export async function bad(sb) {
        const { data } = await sb${FROM('bookings')}.select('*')
        return data
      }
    `)
    const baselined = run(dir, ['--update-baseline'])
    expect(baselined.status).toBe(0)

    const clean = run(dir)
    expect(clean.status, clean.stderr).toBe(0)
    expect(clean.stdout).toContain('1 known/baselined')

    // A second, DIFFERENT unscoped query introduced after the baseline was cut
    // must still red-gate — the baseline must not blanket-suppress the file.
    write(dir, 'src/new-leak.ts', `
      export async function bad2(sb) {
        const { data } = await sb${FROM('clients')}.select('*')
        return data
      }
    `)
    const dirty = run(dir)
    expect(dirty.status).toBe(1)
    expect(dirty.stderr).toContain('clients')
    expect(dirty.stderr).not.toContain('bookings') // the baselined one stays quiet
  })
})
