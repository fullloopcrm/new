import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/admin/recurring-schedules (converted to tenantDb).
 *
 * The list SELECT runs through tenantDb (`.eq('tenant_id', ctx)`), so a recurring
 * schedule owned by ANOTHER tenant must never appear in the response. The
 * per-schedule "next booking" sub-query is also tenant-scoped. This is the
 * wrong-tenant probe on a list route.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

// POST-only dep — mocked so importing the route doesn't pull the real token lib.
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))

import { GET } from './route'

function seed() {
  return {
    recurring_schedules: [
      { id: 'rs-a', tenant_id: CTX_TENANT, client_id: 'c-a', recurring_type: 'weekly', created_at: '2026-01-02' },
      { id: 'rs-b', tenant_id: OTHER_TENANT, client_id: 'c-b', recurring_type: 'weekly', created_at: '2026-01-01' },
    ],
    bookings: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/recurring-schedules GET — tenant isolation', () => {
  it("wrong-tenant probe: list excludes the foreign tenant's schedule", async () => {
    const res = await GET(new Request('http://t/api/admin/recurring-schedules'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body as Array<{ id: string }>).map((s) => s.id)
    expect(ids).toContain('rs-a')
    expect(ids).not.toContain('rs-b')
  })
})
