import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/clients/[id]/contacts (list, converted to tenantDb).
 *
 * Contacts are read by client_id with NO explicit tenant filter in the route —
 * the sole guard is tenantDb.select injecting `.eq('tenant_id', ctx)`. This is
 * contact PII (name/phone/email), so a cross-tenant leak here is high-impact.
 * A client_id can collide across tenants; the probe seeds a same-id row under
 * another tenant and asserts it is filtered OUT, never returned to tenant A.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'
const CLIENT_ID = 'client-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (t: string) => holder.from!(t) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    client_contacts: [
      {
        id: 'ct-a',
        tenant_id: CTX_TENANT,
        client_id: CLIENT_ID,
        name: 'Alice A',
        phone_e164: '+15550000001',
        email: 'alice@a.test',
        is_primary: true,
        created_at: '2026-01-01',
      },
      {
        id: 'ct-b',
        tenant_id: OTHER_TENANT,
        client_id: CLIENT_ID,
        name: 'Bob B',
        phone_e164: '+15550000002',
        email: 'bob@b.test',
        is_primary: true,
        created_at: '2026-01-01',
      },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('clients/[id]/contacts GET (list) — tenant isolation', () => {
  it("positive control: tenant A sees its OWN client's contact", async () => {
    const res = await GET(new Request('http://t/api/clients/client-1/contacts'), ctx(CLIENT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.map((c: { id: string }) => c.id)
    expect(ids).toContain('ct-a')
  })

  it("wrong-tenant probe: tenant B's contact (same client_id) is never returned", async () => {
    const res = await GET(new Request('http://t/api/clients/client-1/contacts'), ctx(CLIENT_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.map((c: { id: string }) => c.id)
    expect(ids).not.toContain('ct-b')
    expect(body.every((c: { tenant_id: string }) => c.tenant_id === CTX_TENANT)).toBe(true)
  })
})
