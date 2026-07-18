import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Team-portal auth (PIN login) — tenant_slug resolver-twin hardening.
 *
 * Same bug class as portal/auth's: this route hand-rolls its own
 * `tenants.slug` lookup instead of the shared resolver, so it never
 * inherited the resolver's `.toLowerCase()` normalization or its
 * maybeSingle()+explicit-error-check masked-error fix. A mixed-case
 * tenant_slug from a caller other than the tenant's own site (whose
 * middleware-injected x-tenant-slug header is always already lowercase)
 * silently 404'd for a real, active tenant.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 4 }) }))
vi.mock('@/lib/hr', () => ({ getTerminatedTeamMemberIds: async () => [] }))
vi.mock('./token', () => ({ createToken: () => 'minted-token' }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [{ id: A, slug: 'tenant-a', status: 'active', name: 'Tenant A', phone: null }],
    team_members: [{ id: 'm-1', tenant_id: A, pin: '1234', status: 'active', name: 'Larry', preferred_language: null, pay_rate: null, avatar_url: null, role: 'worker' }],
  })
  holder.from = h.from
})

function req(body: unknown): Request {
  return { headers: { get: () => null }, json: async () => body } as unknown as Request
}

describe('team-portal auth — tenant_slug case normalization', () => {
  it('resolves a mixed-case tenant_slug to the same (lowercase-stored) tenant', async () => {
    const res = await POST(req({ pin: '1234', tenant_slug: 'Tenant-A' }))
    expect(res.status).toBe(200)
    expect((await res.json()).token).toBe('minted-token')
  })

  it('an unknown slug (even case-correct) still 404s — not a false positive', async () => {
    const res = await POST(req({ pin: '1234', tenant_slug: 'no-such-tenant' }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Business not found')
  })
})

describe('team-portal auth — masked tenant-lookup DB error surfaces loud, not as a false 404', () => {
  it('a genuine tenant-lookup failure returns 500, not "Business not found"', async () => {
    holder.from = (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }) }),
            }),
          }),
        }
      }
      return h.from(table)
    }

    const res = await POST(req({ pin: '1234', tenant_slug: 'tenant-a' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toBe('Business not found')
  })
})
