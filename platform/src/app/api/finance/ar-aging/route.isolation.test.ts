import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/ar-aging (converted to tenantDb).
 *
 * AR aging reads unpaid invoices + completed-unpaid bookings through tenantDb, so
 * a foreign tenant's receivables never appear in this tenant's aging report.
 * Probe: only the acting tenant's invoice + booking are aged; tenant B's rows and
 * their balances are absent.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))

import { GET } from './route'

function seed() {
  return {
    invoices: [
      { id: 'inv-a', tenant_id: A, invoice_number: 'A-1', title: 't', total_cents: 10000, amount_paid_cents: 0, due_date: '2026-01-01', status: 'sent', client_id: null, contact_name: 'A' },
      { id: 'inv-b', tenant_id: B, invoice_number: 'B-1', title: 't', total_cents: 88888, amount_paid_cents: 0, due_date: '2026-01-01', status: 'sent', client_id: null, contact_name: 'B' },
    ],
    bookings: [
      { id: 'bk-a', tenant_id: A, price: 3000, start_time: '2026-01-01T10:00:00Z', payment_status: 'unpaid', status: 'completed', route_id: null, client_id: null },
      { id: 'bk-b', tenant_id: B, price: 77777, start_time: '2026-01-01T10:00:00Z', payment_status: 'unpaid', status: 'completed', route_id: null, client_id: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/ar-aging GET — tenant isolation', () => {
  it("ages only the acting tenant's receivables, never a foreign tenant's", async () => {
    const res = await GET(new Request('http://t/api/finance/ar-aging'))
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = body.rows.map((r: { id: string }) => r.id).sort()
    expect(ids).toEqual(['bk-a', 'inv-a'])
    // A's invoice balance (10000) + A's booking (3000); tenant B contributes nothing.
    expect(body.total_cents).toBe(13000)
  })
})
