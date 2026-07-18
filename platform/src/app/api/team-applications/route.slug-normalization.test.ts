import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Team-applications POST — tenant_slug resolver-twin hardening.
 *
 * Same bug class as sales-applications'/portal-auth's: this public
 * job-application route hand-rolls its own `tenants.slug` lookup instead of
 * the shared resolver, so it never inherited the resolver's
 * `.toLowerCase()` normalization or its maybeSingle()+explicit-error-check
 * masked-error fix. A mixed-case tenant_slug posted directly in the body
 * silently 404'd for a real, active tenant.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [{ id: A, slug: 'tenant-a', status: 'active', name: 'Tenant A' }],
    team_applications: [],
  })
  holder.from = h.from
})

function req(body: unknown, ip = '198.51.100.1'): Request {
  return {
    headers: { get: (k: string) => (k === 'x-forwarded-for' ? ip : null) },
    json: async () => body,
  } as unknown as Request
}

const APPLICANT = { name: 'Pat', phone: '5551234567' }

describe('team-applications POST — tenant_slug case normalization', () => {
  it('resolves a mixed-case tenant_slug to the same (lowercase-stored) tenant', async () => {
    const res = await POST(req({ ...APPLICANT, tenant_slug: 'Tenant-A' }, '198.51.100.2'))
    expect(res.status).toBe(201)
  })

  it('an unknown slug (even case-correct) still 404s — not a false positive', async () => {
    const res = await POST(req({ ...APPLICANT, tenant_slug: 'no-such-tenant' }, '198.51.100.3'))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Business not found')
  })
})

describe('team-applications POST — masked tenant-lookup DB error surfaces loud', () => {
  it('a genuine tenant-lookup failure returns 500, not "Business not found"', async () => {
    holder.from = (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }) }) }) }
      }
      return h.from(table)
    }

    const res = await POST(req({ ...APPLICANT, tenant_slug: 'tenant-a' }, '198.51.100.4'))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toBe('Business not found')
  })
})
