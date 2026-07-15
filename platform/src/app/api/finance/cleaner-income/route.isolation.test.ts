import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/cleaner-income (converted to tenantDb).
 *
 * Per-cleaner pay summaries read `bookings` through tenantDb, so a foreign
 * tenant's completed booking never inflates another tenant's cleaner totals,
 * hours, or paid/unpaid buckets.
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

import { GET } from './route'

function seed() {
  return {
    bookings: [
      { id: 'bk-a1', tenant_id: A, status: 'completed', team_member_id: 'tm-a', team_member_pay: 100, actual_hours: 2, team_member_paid: true, start_time: '2026-01-02' },
      { id: 'bk-a2', tenant_id: A, status: 'completed', team_member_id: 'tm-a', team_member_pay: 50, actual_hours: 1, team_member_paid: false, start_time: '2026-01-01' },
      { id: 'bk-b1', tenant_id: B, status: 'completed', team_member_id: 'tm-b', team_member_pay: 999, actual_hours: 9, team_member_paid: false, start_time: '2026-01-03' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/cleaner-income — tenant isolation', () => {
  it("summaries and rows exclude a foreign tenant's completed bookings", async () => {
    const { NextRequest } = await import('next/server')
    const res = await GET(new NextRequest('http://t/api/finance/cleaner-income'))
    expect(res.status).toBe(200)
    const body = await res.json()

    // Only tenant A's two bookings surface; tenant B's bk-b1 must not.
    const ids = (body.bookings as Array<{ id: string }>).map((b) => b.id).sort()
    expect(ids).toEqual(['bk-a1', 'bk-a2'])
    expect(ids).not.toContain('bk-b1')

    // A single tenant-A cleaner; B's tm-b never appears.
    expect(body.cleanerSummaries).toHaveLength(1)
    const [cleaner] = body.cleanerSummaries as Array<{ team_member_id: string; totalPay: number; paidTotal: number; unpaidTotal: number }>
    expect(cleaner.team_member_id).toBe('tm-a')
    // 100 + 50 — the 999 from tenant B is filtered out, not summed in.
    expect(cleaner.totalPay).toBe(150)
    expect(cleaner.paidTotal).toBe(100)
    expect(cleaner.unpaidTotal).toBe(50)
  })
})
