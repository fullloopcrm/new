/**
 * Drift guard: activate-tenant.ts hand-copies the "determinable" split from
 * src/lib/migrations/059_backfill_vercel_project.sql (FL_PROJECT_ID +
 * FL_SIGNAL_BESPOKE_SLUGS) so the domain_routing step can set
 * tenant_domains.vercel_project on newly-activated tenants instead of leaving
 * it NULL forever until someone remembers to re-run 059 by hand. Same pattern
 * as activate-tenant-bespoke-drift.test.ts's guard on BESPOKE_SITE_TENANTS.
 *
 * If someone updates 059's fl_project id or its 4-tenant FL-signal list and
 * forgets this copy (or vice versa), newly-activated tenants get the WRONG
 * vercel_project asserted — either NULL for a tenant that's provably on FL,
 * or the FL id for a bespoke tenant that may still be on its own standalone
 * project. This reads both files at test time and asserts they agree.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const migrationSrc = readFileSync(resolve(HERE, 'migrations/059_backfill_vercel_project.sql'), 'utf8')
const activateSrc = readFileSync(resolve(HERE, 'activate-tenant.ts'), 'utf8')

function migrationFlProjectId(): string {
  const m = migrationSrc.match(/fl_project text := '(prj_[A-Za-z0-9]+)';/)
  expect(m, 'fl_project literal not found in 059_backfill_vercel_project.sql').toBeTruthy()
  return m![1]
}

function activateFlProjectId(): string {
  const m = activateSrc.match(/FL_PROJECT_ID = '(prj_[A-Za-z0-9]+)'/)
  expect(m, 'FL_PROJECT_ID literal not found in activate-tenant.ts').toBeTruthy()
  return m![1]
}

// 059's unknown_slugs are the bespoke tenants left NULL (undeterminable).
// activate-tenant.ts instead tracks the complement it CAN assert — the FL-
// signal bespoke tenants — since it derives "determinable" from
// BESPOKE_SITE_TENANTS minus this set. Both must agree with 059's own
// commented FL-signal list (the "WHAT IS DETERMINABLE FROM REPO" block).
function migrationUnknownSlugs(): string[] {
  const start = migrationSrc.indexOf('unknown_slugs text[] := array[')
  expect(start, 'unknown_slugs array not found in 059_backfill_vercel_project.sql').toBeGreaterThan(-1)
  const end = migrationSrc.indexOf('];', start)
  // Strip SQL line comments first — a trailing `-- ... 'sunnyside-clean' ...`
  // annotation on one entry would otherwise smuggle an extra quoted slug into
  // the match (seen live: the sunnyside-clean-nyc entry's own comment).
  const withoutComments = migrationSrc
    .slice(start, end)
    .split('\n')
    .map((line) => line.replace(/--.*$/, ''))
    .join('\n')
  return [...withoutComments.matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

function activateBespokeSlugs(): string[] {
  const start = activateSrc.indexOf('BESPOKE_SITE_TENANTS = new Set<string>([')
  const end = activateSrc.indexOf('])', start)
  return [...activateSrc.slice(start, end).matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

function activateFlSignalBespokeSlugs(): string[] {
  const start = activateSrc.indexOf('FL_SIGNAL_BESPOKE_SLUGS = new Set<string>([')
  expect(start, 'FL_SIGNAL_BESPOKE_SLUGS set not found in activate-tenant.ts').toBeGreaterThan(-1)
  const end = activateSrc.indexOf('])', start)
  return [...activateSrc.slice(start, end).matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

describe('activate-tenant.ts vercel_project copy ⇄ 059_backfill_vercel_project.sql (no-drift guard)', () => {
  it('FL_PROJECT_ID matches the migration\'s fl_project literal', () => {
    expect(activateFlProjectId()).toBe(migrationFlProjectId())
  })

  it('FL_SIGNAL_BESPOKE_SLUGS is exactly (BESPOKE_SITE_TENANTS minus the migration\'s unknown_slugs)', () => {
    const bespoke = new Set(activateBespokeSlugs())
    const unknown = new Set(migrationUnknownSlugs())
    const expectedFlSignal = [...bespoke].filter((s) => !unknown.has(s))
    expect(new Set(activateFlSignalBespokeSlugs())).toEqual(new Set(expectedFlSignal))
  })

  it('FL_SIGNAL_BESPOKE_SLUGS and the migration\'s unknown_slugs are disjoint and together cover every bespoke slug', () => {
    const bespoke = new Set(activateBespokeSlugs())
    const flSignal = activateFlSignalBespokeSlugs()
    const unknown = migrationUnknownSlugs()
    for (const s of flSignal) expect(unknown, `${s} is in both FL-signal and unknown lists`).not.toContain(s)
    expect(new Set([...flSignal, ...unknown])).toEqual(bespoke)
  })

  it('neither list is empty (parser sanity — a bad slice must not pass vacuously)', () => {
    expect(activateFlSignalBespokeSlugs().length).toBeGreaterThan(0)
    expect(migrationUnknownSlugs().length).toBeGreaterThan(0)
  })
})

describe('activate-tenant.ts domain_routing sets vercel_project from the determinable split', () => {
  it('the upserted rows array includes a vercel_project field derived from BESPOKE_SITE_TENANTS/FL_SIGNAL_BESPOKE_SLUGS', () => {
    expect(activateSrc).toMatch(
      /!BESPOKE_SITE_TENANTS\.has\(tenant\.slug\) \|\| FL_SIGNAL_BESPOKE_SLUGS\.has\(tenant\.slug\)\s*\n?\s*\?\s*FL_PROJECT_ID\s*\n?\s*:\s*null/
    )
    expect(activateSrc).toMatch(/vercel_project: vercelProject/)
  })
})
