import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * POST /api/admin/campaigns/generate — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): the AI-generated "Book Now" CTA URL embedded in
 * customer-facing marketing email/SMS was built from tenant.domain
 * directly, the legacy column only, never consulting tenant_domains. A
 * tenant whose real custom domain lives only in tenant_domains (the normal
 * state — admin/websites writes tenant_domains only, never tenants.domain)
 * got a bare "/book" relative path baked into the generated copy, a dead
 * link in an email client or SMS. Fixed by resolving through
 * tenantSiteUrl() (tenant_domains PRIMARY -> tenants.domain -> slug
 * subdomain).
 */

const A = 'tid-campaigns-a'
const B = 'tid-campaigns-b'

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

const createMock = vi.hoisted(() => vi.fn())
vi.mock('@/lib/anthropic-client', () => ({
  anthropicFromStoredKey: () => ({ messages: { create: createMock } }),
}))

import { POST } from './route'

function seed() {
  return { tenant_domains: [] as Record<string, unknown>[] }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.tenant = { id: A, name: 'Acme Cleaning', slug: A, domain: null, anthropic_api_key: 'stored-key' }
  createMock.mockReset()
  createMock.mockResolvedValue({
    content: [{ type: 'text', text: '{"name":"Spring Promo","subject":"Hi","email_body":"","sms_body":""}' }],
  })
})

function req() {
  return new Request('http://t', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'spring cleaning promo', channel: 'email' }),
  })
}

function promptText(): string {
  const call = createMock.mock.calls[createMock.mock.calls.length - 1]
  const args = call?.[0] as { messages?: Array<{ content?: string }> } | undefined
  return args?.messages?.[0]?.content || ''
}

describe('POST /api/admin/campaigns/generate — domain-fallback bug-class probe', () => {
  it('domain-fallback: tenants.domain is null but tenant_domains has an active PRIMARY row — embeds that host, not a relative path', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(promptText()).toContain('https://custom.example.com/book')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    tenantHolder.tenant = { ...tenantHolder.tenant, domain: 'legacy.example.com' }
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(promptText()).toContain('https://legacy.example.com/book')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's generated copy", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await POST(req())
    expect(res.status).toBe(200)
    expect(promptText()).toContain('https://a-real.example.com/book')
    expect(promptText()).not.toContain('b-real.example.com')
  })
})
