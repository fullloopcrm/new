import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'
import { nowNaiveET } from '@/lib/recurring'

/**
 * GET /api/dashboard — broad-hunt: the operator aggregator is gated on
 * 'bookings.view' (every role including staff), but its response also
 * carries real revenue numbers under `financials`. staff lacks finance.view
 * per rbac.ts, yet got the same $-amounts as owner/admin/manager. Redacted
 * `financials` to null for any role without finance.view, matching W4's
 * independent fix of the same class on a sibling branch.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
  selenaConfig: null as Record<string, unknown> | null,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string; selenaConfig: Record<string, unknown> | null }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { selena_config: h.selenaConfig }, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.selenaConfig = null
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', start_time: nowNaiveET(), status: 'completed', payment_status: 'paid', price: 4200 },
    ],
    clients: [],
    team_members: [],
  }
})

describe('GET /api/dashboard — financials redaction for roles without finance.view', () => {
  it('staff (bookings.view only) gets financials:null (aggregated revenue redacted)', async () => {
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.financials).toBeNull()
  })

  it('manager (has finance.view by default) sees real financials', async () => {
    h.role = 'manager'
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(4200)
  })

  it('owner always sees real financials', async () => {
    h.role = 'owner'
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(4200)
  })

  it('a tenant override granting staff finance.view is honored', async () => {
    h.selenaConfig = { role_permissions: { staff: { 'finance.view': true } } }
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(4200)
  })
})
