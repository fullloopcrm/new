import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/businesses — domain normalization ORDER bug (tenant creation).
 *
 * BUG (fixed here): `cleanDomain` stripped `www.` BEFORE lowercasing:
 *   .replace(/^https?:\/\//, '').replace(/\/+$/, '').replace(/^www\./, '').toLowerCase().trim()
 * The www.-strip regex is case-sensitive. A mixed-case paste like
 * "https://WWW.Acme.com/" — a completely ordinary copy-paste from a browser
 * address bar — never matched `/^www\./` (still "WWW." at that point in the
 * chain), so the prefix survived into the lowercased result: "www.acme.com"
 * instead of "acme.com". Every resolver fallback lookup (tenant-lookup.ts /
 * tenant.ts getTenantByDomain step 2: `.toLowerCase().replace(/^www\./, '')`)
 * lowercases FIRST, then strips www. — always normalizing an incoming Host
 * header down to the bare apex. A tenant created with the www.-prefixed
 * stored value could therefore NEVER resolve its own custom domain: no real
 * request host ever equals "www.acme.com" after the resolver's own
 * normalization. Reordered to lowercase first, matching the PUT handlers
 * (admin/businesses/[id], admin/tenants/[id]) and the resolver itself.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/vercel-domains', () => ({
  registerCarryingDomain: vi.fn(async (slug: string) => ({ ok: true, domain: `${slug}.fullloopcrm.com`, status: 'registered' as const })),
}))
vi.mock('@/lib/tenant-lookup', () => ({ invalidateDomainCache: vi.fn() }))

import { POST } from './route'

function seed() {
  return { tenants: [] as Record<string, unknown>[] }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function post(body: unknown) {
  return POST(new Request('http://t/api/admin/businesses', { method: 'POST', body: JSON.stringify(body) }))
}

function storedDomain(name: string): unknown {
  return (h.seed.tenants as Record<string, unknown>[]).find((r) => r.name === name)?.domain
}

describe('POST /api/admin/businesses — domain normalization order', () => {
  it('BUG (fixed): a mixed-case "WWW." prefix is stripped, not lowercased-and-kept', async () => {
    const res = await post({ name: 'Acme', industry: 'cleaning', domain_name: 'https://WWW.Acme.com/' })
    expect(res.status).toBe(200)
    expect(storedDomain('Acme')).toBe('acme.com')
  })

  it('a lowercase www. prefix is also stripped (control case — this direction never broke)', async () => {
    const res = await post({ name: 'Bravo', industry: 'cleaning', domain_name: 'www.bravo.com' })
    expect(res.status).toBe(200)
    expect(storedDomain('Bravo')).toBe('bravo.com')
  })

  it('a plain lowercase domain with no www. is stored unchanged', async () => {
    const res = await post({ name: 'Charlie', industry: 'cleaning', domain_name: 'charlie.com' })
    expect(res.status).toBe(200)
    expect(storedDomain('Charlie')).toBe('charlie.com')
  })

  it('no domain_name at all stores null, not an empty string', async () => {
    const res = await post({ name: 'Delta', industry: 'cleaning' })
    expect(res.status).toBe(200)
    expect(storedDomain('Delta')).toBeNull()
  })
})
