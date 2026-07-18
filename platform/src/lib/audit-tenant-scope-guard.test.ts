import { describe, it, expect, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

// Guards the LOGIC in scripts/audit-tenant-scope.mjs — the static leak
// detector that ci.yml's "Tenant-isolation guard" step (W3 lane: CI wiring)
// runs on EVERY PR to block a new cross-tenant query. (Formerly ALSO run by a
// separate .github/workflows/tenant-scope.yml — a pure duplicate of this same
// command on the same triggers since ci.yml added its own copy hours after
// tenant-scope.yml already existed on 2026-07-04; consolidated into ci.yml
// only, see tenant-scope-workflow-consolidation.test.ts.) Every other
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
// Same reasoning, double- and backtick-quoted (item (194)): the interpolated
// `${table}` / concatenated `+ table +` breaks the guard's own [a-z_]+
// character class, so these never accidentally self-flag either.
const FROM_DQ = (table: string): string => `.from("${table}")`
const FROM_BT = (table: string): string => '.from(`' + table + '`)'

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

// Item (194): the .from() table matcher was single-quote-only. A double- or
// backtick-quoted call on a tenant table (e.g. .from with a double-quoted
// 'bookings' argument) didn't get misclassified — it skipped this source
// line entirely, invisible to the live blocking gate. No live occurrence
// exists in the repo today (verified: every current double/backtick
// `.from(...)` call targets a table outside TENANT_TABLES), so this is a
// prospective contract fix, not a live-leak fix
// — same distinction items (191)-(193) drew for their own primitives.
describe('audit-tenant-scope guard — quote-agnostic .from() matching (item 194)', () => {
  it('flags and RED-GATES a double-quoted .from("table") the same as single-quoted', () => {
    const dir = fixture()
    write(dir, 'src/leak.ts', `
      export async function bad(sb) {
        const { data } = await sb${FROM_DQ('bookings')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status).toBe(1)
    expect(stderr).toContain('bookings')
    expect(stderr).toContain('leak.ts')
  })

  it('flags and RED-GATES a backtick-quoted .from(`table`) the same as single-quoted', () => {
    const dir = fixture()
    write(dir, 'src/leak.ts', `
      export async function bad(sb) {
        const { data } = await sb${FROM_BT('clients')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status).toBe(1)
    expect(stderr).toContain('clients')
  })

  it('still passes a double-quoted .from("table") that IS scoped by tenant_id', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb, tenantId) {
        const { data } = await sb${FROM_DQ('bookings')}.select('*').eq('tenant_id', tenantId)
        return data
      }
    `)
    const { status } = run(dir)
    expect(status).toBe(0)
  })
})

// Item (195): continuing (194)'s surface — the sibling idLookup regex on the
// same script has the identical hardcoded-single-quote defect. Unlike (194)
// (a silent miss), this one is a FALSE POSITIVE: a genuinely safe
// double/backtick-quoted `.eq("id", …)` row lookup would red-gate CI with no
// real leak behind it, because idLookup fails to match and scoped is also
// false. Fixed identically, for the same "one contract, not per-call-site"
// reason as (194).
describe('audit-tenant-scope guard — quote-agnostic idLookup matching (item 195)', () => {
  it('passes a double-quoted row-specific id lookup (no false-positive red-gate)', () => {
    const dir = fixture()
    write(dir, 'src/ok.ts', `
      export async function ok(sb, id) {
        const { data } = await sb${FROM('bookings')}.select('*').eq("id", id)
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(0)
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

  it('does NOT let a variable name RE-DECLARED for a non-tenantDb value in a different function inherit an earlier same-named tenantDb var\'s safety', () => {
    // Regression guard: tenantDbVars was a flat, file-global Set of NAMES —
    // "was `db` EVER assigned from tenantDb(...) anywhere in this file" —
    // with no notion of WHICH declaration is in scope at a given call site.
    // An ordinary, unremarkable variable-name collision (`db` used for a
    // tenantDb-bound client in one handler, reused for a plain/unscoped
    // client in a different handler of the same file) let the second
    // declaration's genuinely unscoped query silently inherit the first
    // declaration's "safe" status by name alone. Verified live before the
    // fix: this exact fixture passed with exit 0.
    const dir = fixture()
    write(dir, 'src/leak.ts', `
      export async function scoped(tenantId) {
        const db = tenantDb(tenantId)
        await db${FROM('bookings')}.select('*')
      }
      export async function leaky(supabaseAdmin) {
        const db = supabaseAdmin
        const { data } = await db${FROM('clients')}.select('*')
        return data
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(1)
    expect(stderr).toContain('clients')
    expect(stderr).toContain('leak.ts')
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

  it('does not let baselining one occurrence silently launder a DIFFERENT occurrence that shares identical .from() text in the same file', () => {
    // Regression guard: keyOf used to be file::table::snippet (the single
    // trimmed .from() line only), so two distinct call sites on the same
    // table in the same file with byte-identical `.from('table')` text but
    // different surrounding chains collapsed onto the same baseline key —
    // baselining one silently accepted the other too.
    const dir = fixture()
    write(dir, 'src/dup.ts', `
      export async function forAdmin(sb) {
        const { data } = await sb${FROM('push_subscriptions')}
          .select('id')
          .eq('role', 'admin')
        return data
      }
    `)
    const baselined = run(dir, ['--update-baseline'])
    expect(baselined.status).toBe(0)

    // A second, genuinely different call site: same table, same trimmed
    // .from() snippet text, but a distinct filter (role='cleaner' vs
    // 'admin') a few lines down in the same chain — must still red-gate.
    write(dir, 'src/dup.ts', `
      export async function forAdmin(sb) {
        const { data } = await sb${FROM('push_subscriptions')}
          .select('id')
          .eq('role', 'admin')
        return data
      }
      export async function forCleaner(sb) {
        const { data } = await sb${FROM('push_subscriptions')}
          .select('id')
          .eq('role', 'cleaner')
        return data
      }
    `)
    const after = run(dir)
    expect(after.status, after.stderr).toBe(1)
    expect(after.stderr).toContain('dup.ts')
  })
})

describe('audit-tenant-scope guard — spread-indirection blind spot (insert payload built as a variable)', () => {
  // Found and fixed live this session: src/lib/territories/data.ts's
  // claimTerritory() builds an insert payload as `const fields = { tenant_id:
  // ..., ... }` well above the .from().insert() call, then does
  // `.insert({ territory_id, category_id, ...fields })`. The guard's `scoped`
  // check only text-scans the 12 lines STARTING AT the .from() line — it never
  // resolves a spread back to the variable's own definition, no matter how
  // close or far away that definition is. A refactor that separates payload
  // construction from the insert call (exactly the (160)-(161) territory-claim
  // fix did, splitting a single-purpose INSERT into shared-fields +
  // update-in-place/insert-fresh) silently red-gates CI even though the
  // insert was never actually unscoped. The live fix: destructure tenant_id
  // out of the spread and list it as an explicit literal key alongside the
  // other inline fields — the same convention every other insert site in this
  // codebase already uses (campaigns, clients, documents/fields, reviews,
  // schedules, settings/services, team routes). This test pins BOTH halves so
  // a future session doesn't have to rediscover it: the blind spot is real
  // (spread-only payload false-flags), and the established fix pattern
  // (explicit inline key) reliably un-blinds it.
  it('FALSE POSITIVE: flags an insert whose payload comes only from a `...spread` of a variable built above the lookahead window, even though that variable genuinely carries tenant_id', () => {
    const dir = fixture()
    const filler = Array.from({ length: 14 }, (_, i) => `      // filler line ${i}`).join('\n')
    write(dir, 'src/scoped-but-indirect.ts', `
      export async function makeClaim(sb, tenantId) {
        const fields = {
          tenant_id: tenantId,
          status: 'claimed',
        }
${filler}
        const { error } = await sb${FROM('territory_claims')}.insert({
          territory_id: 't1',
          category_id: 'c1',
          ...fields,
        })
        return error
      }
    `)
    const { status, stderr } = run(dir)
    expect(
      status,
      'if this now passes, the guard learned to resolve spread variables — ' +
        'update this test to reflect the fix rather than deleting it',
    ).toBe(1)
    expect(stderr).toContain('territory_claims')
  })

  it('FIX PATTERN: an explicit inline `tenant_id:` key alongside the same spread passes clean', () => {
    const dir = fixture()
    const filler = Array.from({ length: 14 }, (_, i) => `      // filler line ${i}`).join('\n')
    write(dir, 'src/scoped-explicit.ts', `
      export async function makeClaim(sb, tenantId) {
        const fields = {
          tenant_id: tenantId,
          status: 'claimed',
        }
${filler}
        const { tenant_id, ...restFields } = fields
        const { error } = await sb${FROM('territory_claims')}.insert({
          territory_id: 't1',
          category_id: 'c1',
          tenant_id,
          ...restFields,
        })
        return error
      }
    `)
    const { status, stderr } = run(dir)
    expect(status, stderr).toBe(0)
  })
})
