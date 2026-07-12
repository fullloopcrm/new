import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/dashboard/hr/[id] (converted to tenantDb).
 *
 * `id` is a team_member_id. The member lookup runs through tenantDb
 * (`.eq('tenant_id', ctx)`), so requesting a member that belongs to ANOTHER
 * tenant must 404 — never leak the foreign employee's basics, HR profile,
 * documents, or notes. This is the wrong-tenant probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// Grant the permission and hand back the tenant context the route expects.
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { GET } from './route'

function seed() {
  return {
    team_members: [
      { id: 'tm-a', tenant_id: CTX_TENANT, name: 'Alice', email: 'a@x', phone: '', role: 'cleaner', active: true, address: null, photo_url: null, stripe_account_id: null, stripe_ready_at: null },
      { id: 'tm-b', tenant_id: OTHER_TENANT, name: 'Bob', email: 'b@x', phone: '', role: 'cleaner', active: true, address: null, photo_url: null, stripe_account_id: null, stripe_ready_at: null },
    ],
    hr_employee_profiles: [],
    hr_documents: [],
    hr_notes: [],
    hr_document_requirements: [],
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

describe('dashboard/hr/[id] GET — tenant isolation', () => {
  it('positive control: tenant A reads its OWN employee', async () => {
    const res = await GET(new Request('http://t/api/dashboard/hr/tm-a') as never, ctx('tm-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-a')
    expect(body.member.tenant_id).toBe(CTX_TENANT)
  })

  it("wrong-tenant probe: tenant B's employee id returns 404, never the foreign record", async () => {
    const res = await GET(new Request('http://t/api/dashboard/hr/tm-b') as never, ctx('tm-b'))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBe('employee not found')
    expect(body.member).toBeUndefined()
  })
})
