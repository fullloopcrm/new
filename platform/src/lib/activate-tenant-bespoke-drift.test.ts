/**
 * Drift guard: activate-tenant.ts hand-copies BESPOKE_SITE_TENANTS from
 * src/middleware.ts (see comment at its declaration) so the domain_routing
 * step can set tenant_domains.routing_mode correctly on insert instead of
 * silently falling to the column DEFAULT ('template'). Same pattern as
 * tenant-domains-routing-spec.test.ts's guard on the 055 backfill SQL.
 *
 * If someone adds/removes a bespoke tenant in middleware.ts and forgets this
 * copy (or vice versa), newly-activated tenants get the WRONG routing_mode
 * written to tenant_domains — DB says template-routed while the real site is
 * bespoke (or vice versa). This reads both files at test time and asserts the
 * slug sets are identical.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/lib
const middlewareSrc = readFileSync(resolve(HERE, '../middleware.ts'), 'utf8')
const activateSrc = readFileSync(resolve(HERE, 'activate-tenant.ts'), 'utf8')

function slugsIn(block: string): string[] {
  return [...block.matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

function middlewareBespokeSlugs(): string[] {
  const start = middlewareSrc.indexOf('BESPOKE_SITE_TENANTS = new Set<string>([')
  expect(start, 'BESPOKE_SITE_TENANTS set not found in middleware.ts').toBeGreaterThan(-1)
  const end = middlewareSrc.indexOf('])', start)
  return slugsIn(middlewareSrc.slice(start, end))
}

function activateBespokeSlugs(): string[] {
  const start = activateSrc.indexOf('BESPOKE_SITE_TENANTS = new Set<string>([')
  expect(start, 'BESPOKE_SITE_TENANTS set not found in activate-tenant.ts').toBeGreaterThan(-1)
  const end = activateSrc.indexOf('])', start)
  return slugsIn(activateSrc.slice(start, end))
}

describe('activate-tenant.ts BESPOKE_SITE_TENANTS ⇄ middleware.ts (no-drift guard)', () => {
  it('the activation copy equals the middleware set, exactly', () => {
    const mw = middlewareBespokeSlugs()
    const act = activateBespokeSlugs()
    expect(new Set(act), 'activate-tenant.ts has slugs middleware lacks').toEqual(new Set(mw))
    expect([...act].sort()).toEqual([...mw].sort())
  })

  it('neither list is empty (parser sanity — a bad slice must not pass vacuously)', () => {
    expect(middlewareBespokeSlugs().length).toBeGreaterThan(0)
    expect(activateBespokeSlugs().length).toBeGreaterThan(0)
  })

  it('the activation copy has no duplicate slugs', () => {
    const act = activateBespokeSlugs()
    expect(act.length).toBe(new Set(act).size)
  })
})

describe('activate-tenant.ts domain_routing sets routing_mode from BESPOKE_SITE_TENANTS', () => {
  it('the upserted rows array includes a routing_mode field derived from the bespoke set', () => {
    expect(activateSrc).toMatch(
      /const routingMode = BESPOKE_SITE_TENANTS\.has\(tenant\.slug\) \? 'bespoke' : 'template'/
    )
    expect(activateSrc).toMatch(/routing_mode: routingMode/)
  })
})
