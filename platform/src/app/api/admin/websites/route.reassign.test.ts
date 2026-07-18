import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PATCH /api/admin/websites — domain reassignment (missing-feature gap, now
 * closed).
 *
 * GAP (fixed here): POST's own 409/23505 error text has always promised "...
 * remove it there first, or reassign it, before adding it here" but no
 * "reassign" path existed anywhere in this route — an admin's only option was
 * DELETE (on the OTHER tenant's admin row, once one exists) + POST (re-add
 * under the new tenant), or for a legacy tenants.domain collision, navigating
 * to that tenant's admin/businesses page to manually clear the field, with no
 * cross-link. This PATCH handler moves an existing tenant_domains row to a
 * different tenant_id directly, without a DELETE+POST round trip re-attaching
 * the domain at Vercel (only ownership moves, not routing).
 */

const TENANT_A = 'tid-a'
const TENANT_B = 'tid-b'
const TENANT_C = 'tid-c'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

const invalidateDomainCache = vi.fn()
const invalidateTenantCache = vi.fn()
vi.mock('@/lib/tenant-lookup', () => ({
  invalidateDomainCache: (domain: string) => invalidateDomainCache(domain),
  invalidateTenantCache: (id: string) => invalidateTenantCache(id),
}))

import { PATCH } from './route'

function seed() {
  return {
    tenants: [
      { id: TENANT_A, name: 'Alpha Co' },
      { id: TENANT_B, name: 'Bravo Co' },
    ] as Record<string, unknown>[],
    tenant_domains: [
      { id: 'td-1', tenant_id: TENANT_A, domain: 'movable.com', active: true, is_primary: true },
      { id: 'td-2', tenant_id: TENANT_A, domain: 'other-alpha.com', active: true, is_primary: false },
      { id: 'td-3', tenant_id: TENANT_B, domain: 'bravo-own.com', active: true, is_primary: true },
    ] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  invalidateDomainCache.mockClear()
  invalidateTenantCache.mockClear()
})

function patch(body: unknown) {
  return PATCH(new NextRequest('http://t/api/admin/websites', { method: 'PATCH', body: JSON.stringify(body) }))
}

function rowById(id: string) {
  return (h.seed.tenant_domains as Record<string, unknown>[]).find((r) => r.id === id)
}

describe('PATCH /api/admin/websites — domain reassignment', () => {
  it('reassigns a domain from its current tenant to a different tenant', async () => {
    const res = await patch({ id: 'td-1', tenant_id: TENANT_B })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.domain.tenant_id).toBe(TENANT_B)
    expect(rowById('td-1')?.tenant_id).toBe(TENANT_B)
  })

  it('forces is_primary false on the destination side instead of carrying over the source flag', async () => {
    // td-1 is is_primary:true under TENANT_A; TENANT_B already has its own
    // primary (td-3). Carrying the flag over would create two live primaries
    // for TENANT_B.
    const res = await patch({ id: 'td-1', tenant_id: TENANT_B })
    expect(res.status).toBe(200)
    expect(rowById('td-1')?.is_primary).toBe(false)
    expect(rowById('td-3')?.is_primary).toBe(true)
  })

  it('WRONG-TENANT PROBE: reassigning one domain never touches sibling rows on the source or destination tenant', async () => {
    const res = await patch({ id: 'td-1', tenant_id: TENANT_B })
    expect(res.status).toBe(200)
    expect(rowById('td-2')?.tenant_id).toBe(TENANT_A)
    expect(rowById('td-3')?.tenant_id).toBe(TENANT_B)
  })

  it('busts the domain cache and BOTH the source and destination tenant caches', async () => {
    const res = await patch({ id: 'td-1', tenant_id: TENANT_B })
    expect(res.status).toBe(200)
    expect(invalidateDomainCache).toHaveBeenCalledWith('movable.com')
    expect(invalidateTenantCache).toHaveBeenCalledWith(TENANT_A)
    expect(invalidateTenantCache).toHaveBeenCalledWith(TENANT_B)
  })

  it('404s when the domain id does not exist', async () => {
    const res = await patch({ id: 'td-missing', tenant_id: TENANT_B })
    expect(res.status).toBe(404)
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })

  it('404s when the destination tenant does not exist', async () => {
    const res = await patch({ id: 'td-1', tenant_id: 'tid-ghost' })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/tenant not found/i)
    expect(rowById('td-1')?.tenant_id).toBe(TENANT_A)
  })

  it('NO-OP GUARD: rejects reassigning a domain to the tenant that already owns it', async () => {
    const res = await patch({ id: 'td-1', tenant_id: TENANT_A })
    expect(res.status).toBe(400)
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })

  it('400s when id or tenant_id is missing', async () => {
    const res1 = await patch({ tenant_id: TENANT_B })
    expect(res1.status).toBe(400)
    const res2 = await patch({ id: 'td-1' })
    expect(res2.status).toBe(400)
  })

  it('LEGACY-COLLISION PROBE: refuses to reassign a domain onto a tenant when a THIRD tenant already owns that exact host via legacy tenants.domain, and never mutates the row', async () => {
    h.seed.tenants.push({ id: TENANT_C, name: 'Charlie Legacy Co', domain: 'movable.com' })

    const res = await patch({ id: 'td-1', tenant_id: TENANT_B })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toContain('Charlie Legacy Co')
    // Untouched — still owned by the original tenant, not silently moved.
    expect(rowById('td-1')?.tenant_id).toBe(TENANT_A)
    expect(invalidateDomainCache).not.toHaveBeenCalled()
  })

  it('legacy-collision check excludes the DESTINATION tenant itself (self-migration is not a false positive)', async () => {
    // TENANT_B legitimately also carries this same host in its own legacy
    // tenants.domain column (mid-migration) — reassigning td-1 to TENANT_B
    // should succeed, not be blocked by TENANT_B's own legacy row.
    const bIndex = (h.seed.tenants as Record<string, unknown>[]).findIndex((t) => t.id === TENANT_B)
    ;(h.seed.tenants as Record<string, unknown>[])[bIndex] = { id: TENANT_B, name: 'Bravo Co', domain: 'movable.com' }

    const res = await patch({ id: 'td-1', tenant_id: TENANT_B })
    expect(res.status).toBe(200)
    expect(rowById('td-1')?.tenant_id).toBe(TENANT_B)
  })
})
