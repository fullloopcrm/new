import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/broadcast-guidelines — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the team-login portal link texted to every active team
 * member was built from tenant.domain directly, the legacy column only,
 * never consulting tenant_domains. A tenant whose real custom domain lives
 * only in tenant_domains (the normal state — admin/websites writes
 * tenant_domains only, never tenants.domain) got a bare "/team" relative
 * path texted in an SMS, a dead link outside a browser tab already on the
 * tenant's site. Fixed by resolving through tenantSiteUrl() (tenant_domains
 * PRIMARY -> tenants.domain -> slug subdomain).
 */

const A = 'tid-broadcast-a'
const B = 'tid-broadcast-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({ tenant: {} as Record<string, unknown> }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: (tenantHolder.tenant as { id: string }).id,
      tenant: tenantHolder.tenant,
      role: 'owner',
    })),
  }
})

const notifyMock = vi.hoisted(() => vi.fn(async (_args: { message?: string }) => ({ success: true })))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

import { POST } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-1', tenant_id: A, name: 'Ann', pin: '1234', preferred_language: 'en', status: 'active' },
    ],
    tenant_domains: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  notifyMock.mockClear()
  tenantHolder.tenant = { id: A, name: 'Tenant A', slug: A, domain: null }
})

function sentPortalUrl(): string {
  const call = notifyMock.mock.calls[notifyMock.mock.calls.length - 1]
  const message = (call?.[0] as { message?: string } | undefined)?.message || ''
  return message
}

describe('POST /api/admin/broadcast-guidelines — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — texts that host, not a relative path', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await POST()
    expect(res.status).toBe(200)
    expect(sentPortalUrl()).toContain('https://custom.example.com/team')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    tenantHolder.tenant = { id: A, name: 'Tenant A', slug: A, domain: 'legacy.example.com' }
    const res = await POST()
    expect(res.status).toBe(200)
    expect(sentPortalUrl()).toContain('https://legacy.example.com/team')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's broadcast", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await POST()
    expect(res.status).toBe(200)
    expect(sentPortalUrl()).toContain('https://a-real.example.com/team')
    expect(sentPortalUrl()).not.toContain('b-real.example.com')
  })
})
