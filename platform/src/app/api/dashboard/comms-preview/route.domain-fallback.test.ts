import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/dashboard/comms-preview?send=... — resolver-precedence bug-class
 * probe. Same bug/fix as documents/invoices/quotes [id]/send and
 * documents/public/[token]/sign: the ?send= dev-preview email's `from`
 * fallback (fires only when email_from is unset) read tenant.domain directly
 * and never consulted tenant_domains. Fixed by resolving through
 * getPrimaryTenantDomain() first, same precedence as every other call site.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error { status = 401 },
  getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
}))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))

import { GET } from './route'

function seed() {
  return {
    tenants: [
      {
        id: A, name: 'Acme', phone: null, email: null, address: null,
        logo_url: null, primary_color: null, domain: null,
        resend_api_key: 'enc:resend', email_from: null,
      },
    ],
    tenant_domains: [] as Record<string, any>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function get() {
  return GET(new Request('http://t/api/dashboard/comms-preview?send=payer@x.com'))
}

describe('GET /api/dashboard/comms-preview — fromEmail domain-fallback bug-class probe', () => {
  it('domain-fallback: no email_from, tenants.domain null, tenant_domains has PRIMARY — from uses it, not fullloopcrm.com', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true },
    ]
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe('hello@custom.example.com')
  })

  it('falls back to the generic domain only when neither tenant_domains nor tenants.domain resolve', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe('hello@fullloopcrm.com')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's from address", async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'acme-real.example.com', is_primary: true, active: true },
      { tenant_id: B, domain: 'other-tenant.example.com', is_primary: true, active: true },
    ]
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe('hello@acme-real.example.com')
  })
})
