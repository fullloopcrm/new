import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/revenue (converted to tenantDb).
 *
 * `booking_count` is derived from a direct `bookings` read now scoped by tenantDb
 * (`.eq('tenant_id', ctx)`). A foreign tenant's paid booking in the same window
 * must NOT be counted. (Revenue $ comes from the ledger, mocked to 0 here.)
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: vi.fn(async () => ({ tenantId: A })),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/finance/ledger-reports', () => ({ ledgerProfitAndLoss: vi.fn(async () => ({ revenue_cents: 0 })) }))

import { GET } from './route'

function seed() {
  return {
    bookings: [
      { id: 'a1', tenant_id: A, price: 10000, payment_status: 'paid', payment_date: '2026-07-10T00:00:00Z' },
      { id: 'a2', tenant_id: A, price: 20000, payment_status: 'paid', payment_date: '2026-07-11T00:00:00Z' },
      { id: 'b1', tenant_id: B, price: 99999, payment_status: 'paid', payment_date: '2026-07-10T00:00:00Z' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/revenue GET — tenant isolation', () => {
  it("booking_count counts only the caller's paid bookings; tenant B's is excluded", async () => {
    const res = await GET(new NextRequest('http://t/api/finance/revenue?period=month'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.booking_count).toBe(2)
  })
})
