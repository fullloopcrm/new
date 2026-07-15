import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/cash-flow (converted to tenantDb).
 *
 * The forecast reads bookings/invoices/recurring_expenses through tenantDb, so a
 * foreign tenant's future inflows never bleed into this tenant's projection.
 * Probe: an outsized tenant-B booking in-window is excluded — totals reflect only
 * the acting tenant's row.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

import { GET } from './route'

const soon = new Date(Date.now() + 2 * 86400000).toISOString()

function seed() {
  return {
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 5000, start_time: soon, payment_status: 'unpaid', status: 'scheduled' },
      { id: 'bk-b', tenant_id: B, price: 999999, start_time: soon, payment_status: 'unpaid', status: 'scheduled' },
    ],
    invoices: [] as Record<string, unknown>[],
    recurring_expenses: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/cash-flow GET — tenant isolation', () => {
  it("projects only the acting tenant's inflows, never a foreign tenant's booking", async () => {
    const res = await GET(new Request('http://t/api/finance/cash-flow'))
    expect(res.status).toBe(200)
    const body = await res.json()
    // Only bk-a (5000) is counted; bk-b (999999) is filtered out by tenantDb.
    expect(body.totals.inflows_cents).toBe(5000)
  })
})
