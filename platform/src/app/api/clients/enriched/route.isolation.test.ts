import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/clients/enriched (converted to tenantDb).
 *
 * All four source reads (clients, bookings, recurring_schedules, team_members)
 * now go through tenantDb, so a foreign tenant's client never appears in the
 * enriched list, its bookings never contribute to another client's LTV/health
 * aggregates, and the totals summary never counts a foreign tenant's rows.
 * `getSettings` is stubbed so the probe needs no settings seed.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(async () => ({ active_client_threshold_days: 30, at_risk_threshold_days: 90 })),
}))

import { requirePermission } from '@/lib/require-permission'
import { GET } from './route'
import { NextRequest } from 'next/server'

function seed() {
  return {
    clients: [
      { id: 'cl-a1', tenant_id: A, name: 'A Client', email: 'a@example.com', phone: '5551110000', address: null, status: 'active', source: null, created_at: '2026-01-01' },
      { id: 'cl-b1', tenant_id: B, name: 'Foreign Client', email: 'b@example.com', phone: '5552220000', address: null, status: 'active', source: null, created_at: '2026-01-01' },
    ],
    bookings: [
      { id: 'bk-a1', tenant_id: A, client_id: 'cl-a1', team_member_id: 'tm-a1', price: 100, start_time: '2026-06-01', status: 'completed', payment_status: 'paid' },
      { id: 'bk-b1', tenant_id: B, client_id: 'cl-b1', team_member_id: 'tm-b1', price: 999999, start_time: '2026-06-01', status: 'completed', payment_status: 'paid' },
    ],
    recurring_schedules: [
      { tenant_id: A, client_id: 'cl-a1', recurring_type: 'weekly', day_of_week: 1, preferred_time: '09:00', status: 'active' },
      { tenant_id: B, client_id: 'cl-b1', recurring_type: 'weekly', day_of_week: 2, preferred_time: '10:00', status: 'active' },
    ],
    team_members: [
      { id: 'tm-a1', tenant_id: A, name: 'A Cleaner' },
      { id: 'tm-b1', tenant_id: B, name: 'Foreign Cleaner' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('clients/enriched — tenant isolation', () => {
  it("WRONG-TENANT PROBE: excludes a foreign tenant's client from the enriched list and totals", async () => {
    const res = await GET(new NextRequest('http://t/api/clients/enriched'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.clients as Array<{ id: string }>).map((c) => c.id)
    expect(ids).toEqual(['cl-a1'])
    expect(ids).not.toContain('cl-b1')
    expect(body.totals.total).toBe(1)
  })

  // Regression (2026-07-31, crm-04 re-check) -- see GET /api/clients's
  // matching test for the full rationale. Highest-exposure instance of the
  // pattern: this route returns full client PII joined against bookings/
  // schedules/team.
  it('honors requirePermission(clients.view) denial instead of bypassing it', async () => {
    const { NextResponse } = await import('next/server')
    vi.mocked(requirePermission).mockResolvedValueOnce({
      tenant: null,
      error: NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 }),
    })
    const res = await GET(new NextRequest('http://t/api/clients/enriched'))
    expect(res.status).toBe(403)
  })

  it("a foreign tenant's booking never inflates the acting tenant's client LTV", async () => {
    const res = await GET(new NextRequest('http://t/api/clients/enriched'))
    const body = await res.json()
    const clientA = (body.clients as Array<{ id: string; ltv_actual_cents: number }>).find((c) => c.id === 'cl-a1')!
    // Only bk-a1 (price 100) should count — bk-b1 (price 999999) belongs to B.
    expect(clientA.ltv_actual_cents).toBe(100)
  })

  it("a foreign tenant's team member never surfaces as the preferred cleaner", async () => {
    const res = await GET(new NextRequest('http://t/api/clients/enriched'))
    const body = await res.json()
    const clientA = (body.clients as Array<{ id: string; preferred_cleaner: { name: string } | null }>).find((c) => c.id === 'cl-a1')!
    expect(clientA.preferred_cleaner?.name).toBe('A Cleaner')
  })

  // Feature (2026-07-30, Jeff): the client drawer shows why a client is DNS
  // below the DNS badge -- the enriched list previously never selected or
  // returned dns_reason at all, so the drawer had nothing to render.
  it('includes dns_reason for a client marked do_not_service', async () => {
    const seeded = seed()
    seeded.clients[0] = { ...seeded.clients[0], do_not_service: true, dns_reason: 'Aggressive dog on property' } as typeof seeded.clients[0]
    h = createTenantDbHarness(seeded)
    holder.from = h.from

    const res = await GET(new NextRequest('http://t/api/clients/enriched'))
    const body = await res.json()
    const clientA = (body.clients as Array<{ id: string; dns_status: boolean; dns_reason: string | null }>).find((c) => c.id === 'cl-a1')!
    expect(clientA.dns_status).toBe(true)
    expect(clientA.dns_reason).toBe('Aggressive dog on property')
  })
})
