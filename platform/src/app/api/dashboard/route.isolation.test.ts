import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/dashboard — tenantDb() conversion wrong-tenant probe (P1/W1 backlog
 * batch). This is the operator dashboard aggregator: 15 parallel queries
 * previously each carried their own manual `.eq('tenant_id', tenantId)`;
 * that filter now comes solely from the wrapper. Verifies tenant A's
 * aggregate numbers/lists never fold in tenant B's bookings/clients/team.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'owner' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: h.tenantId, tenant: { name: 'Tenant A', selena_config: null }, role: h.role }),
  AuthError: class AuthError extends Error { status = 401 },
}))
// GET now goes through requirePermission (bookings.view) instead of calling
// getTenantForRequest directly -- see the route's own comment. requirePermission
// itself is not mocked, so the REAL module runs against the mocked
// getTenantForRequest above, exercising the actual rbac permission table.

import { GET } from './route'

const iso = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString()

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.role = 'owner'
  h.seq = 0
  h.store = {
    bookings: [
      { id: 'book-A1', tenant_id: 'tenant-A', start_time: iso(0), status: 'completed', payment_status: 'paid', price: 100 },
      { id: 'book-B1', tenant_id: 'tenant-B', start_time: iso(0), status: 'completed', payment_status: 'paid', price: 999999 },
    ],
    clients: [
      { id: 'cli-A1', tenant_id: 'tenant-A', created_at: iso(0) },
      { id: 'cli-B1', tenant_id: 'tenant-B', created_at: iso(0) },
    ],
    team_members: [
      { id: 'tm-A1', tenant_id: 'tenant-A', name: 'Alex', status: 'active' },
      { id: 'tm-B1', tenant_id: 'tenant-B', name: 'Evil', status: 'active' },
    ],
  }
})

describe('GET /api/dashboard — tenant isolation', () => {
  it("tenant A's today financials never fold in tenant B's booking price", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(100)
    expect(json.financials.today.jobs).toBe(1)
  })

  it("tenant A's client count never includes tenant B's clients", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.clients.total).toBe(1)
  })

  it("tenant A's team member list never includes tenant B's team members", async () => {
    const res = await GET()
    const json = await res.json()
    expect(json.teamMembers.map((t: { id: string }) => t.id)).toEqual(['tm-A1'])
    expect(JSON.stringify(json)).not.toContain('Evil')
  })

  it("tenant B's own request sees only its own booking, never tenant A's", async () => {
    h.tenantId = 'tenant-B'
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(999999)
  })
})

describe('GET /api/dashboard — permission gate + finance-field split (regression, 2026-08-01)', () => {
  // Live bug found while sweeping previously-uncovered routes: this route,
  // the main admin dashboard aggregator, had NO permission check at all
  // (only getTenantForRequest()) and returned real financial data (today/
  // week/month/pending revenue) unconditionally. Same live, default-config
  // gap class as jobs.ts's GET fixed earlier this session: 'staff' has
  // bookings.view but not finance.view by default, so any staff-role team
  // member could already see the full revenue breakdown on the dashboard.

  it('denies the whole request with 403 when the caller lacks bookings.view', async () => {
    h.role = 'nonexistent-role-with-no-permissions'
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('zeroes the financials block for a role without finance.view (staff, the real default) while other fields still populate', async () => {
    h.role = 'staff'
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(0)
    expect(json.financials.week.revenue).toBe(0)
    expect(json.financials.month.revenue).toBe(0)
    expect(json.financials.pending.revenue).toBe(0)
    // Field split, not a whole-request block -- non-financial data still comes through.
    expect(json.clients.total).toBe(1)
    expect(json.teamMembers.map((t: { id: string }) => t.id)).toEqual(['tm-A1'])
  })

  it('still returns real financial data for a role with finance.view (manager)', async () => {
    h.role = 'manager'
    const res = await GET()
    const json = await res.json()
    expect(json.financials.today.revenue).toBe(100)
  })
})
