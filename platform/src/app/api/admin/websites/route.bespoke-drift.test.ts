/**
 * Drift guard: route.ts hand-copies BESPOKE_SITE_TENANTS from src/middleware.ts
 * (see comment at its declaration) so POST /api/admin/websites can set
 * tenant_domains.routing_mode correctly on insert instead of silently falling
 * to the column DEFAULT ('template'). Same pattern as
 * activate-tenant-bespoke-drift.test.ts and tenant-domains-routing-spec.test.ts.
 *
 * If someone adds/removes a bespoke tenant in middleware.ts and forgets this
 * copy (or vice versa), a domain an admin adds manually here for that tenant
 * gets the WRONG routing_mode written to tenant_domains. This reads both files
 * at test time and asserts the slug sets are identical.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url)) // .../src/app/api/admin/websites
const middlewareSrc = readFileSync(resolve(HERE, '../../../../middleware.ts'), 'utf8')
const routeSrc = readFileSync(resolve(HERE, 'route.ts'), 'utf8')

function slugsIn(block: string): string[] {
  return [...block.matchAll(/'([a-z0-9][a-z0-9-]*)'/g)].map((m) => m[1])
}

function middlewareBespokeSlugs(): string[] {
  const start = middlewareSrc.indexOf('BESPOKE_SITE_TENANTS = new Set<string>([')
  expect(start, 'BESPOKE_SITE_TENANTS set not found in middleware.ts').toBeGreaterThan(-1)
  const end = middlewareSrc.indexOf('])', start)
  return slugsIn(middlewareSrc.slice(start, end))
}

function routeBespokeSlugs(): string[] {
  const start = routeSrc.indexOf('BESPOKE_SITE_TENANTS = new Set<string>([')
  expect(start, 'BESPOKE_SITE_TENANTS set not found in route.ts').toBeGreaterThan(-1)
  const end = routeSrc.indexOf('])', start)
  return slugsIn(routeSrc.slice(start, end))
}

describe('admin/websites route.ts BESPOKE_SITE_TENANTS ⇄ middleware.ts (no-drift guard)', () => {
  it('the route copy equals the middleware set, exactly', () => {
    const mw = middlewareBespokeSlugs()
    const rt = routeBespokeSlugs()
    expect(new Set(rt), 'route.ts has slugs middleware lacks').toEqual(new Set(mw))
    expect([...rt].sort()).toEqual([...mw].sort())
  })

  it('neither list is empty (parser sanity — a bad slice must not pass vacuously)', () => {
    expect(middlewareBespokeSlugs().length).toBeGreaterThan(0)
    expect(routeBespokeSlugs().length).toBeGreaterThan(0)
  })

  it('the route copy has no duplicate slugs', () => {
    const rt = routeBespokeSlugs()
    expect(rt.length).toBe(new Set(rt).size)
  })
})

describe('admin/websites route.ts POST sets routing_mode from BESPOKE_SITE_TENANTS', () => {
  it('the insert payload includes a routing_mode field derived from the bespoke set', () => {
    expect(routeSrc).toMatch(
      /const routingMode = tenantRow\?\.slug && BESPOKE_SITE_TENANTS\.has\(tenantRow\.slug as string\)/
    )
    expect(routeSrc).toMatch(/routing_mode: routingMode/)
  })
})
