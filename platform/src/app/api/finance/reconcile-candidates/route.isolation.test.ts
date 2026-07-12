import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/finance/reconcile-candidates (converted to tenantDb).
 *
 * The reconcile screen pulls pending bank_transactions + matchable
 * invoices/bookings/expenses through tenantDb, so a foreign tenant's money rows
 * are never offered as match candidates. Probe: every returned row across all
 * four arrays belongs to the acting tenant.
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
    bank_transactions: [
      { id: 'tx-a', tenant_id: A, txn_date: '2026-01-02', description: 'a', amount_cents: 5000, bank_account_id: 'ba-a', status: 'pending' },
      { id: 'tx-b', tenant_id: B, txn_date: '2026-01-02', description: 'b', amount_cents: 5000, bank_account_id: 'ba-b', status: 'pending' },
    ],
    invoices: [
      { id: 'inv-a', tenant_id: A, invoice_number: 'A-1', total_cents: 5000, amount_paid_cents: 0, due_date: '2026-01-01', contact_name: 'A', status: 'sent' },
      { id: 'inv-b', tenant_id: B, invoice_number: 'B-1', total_cents: 5000, amount_paid_cents: 0, due_date: '2026-01-01', contact_name: 'B', status: 'sent' },
    ],
    bookings: [
      { id: 'bk-a', tenant_id: A, start_time: '2026-01-02T00:00:00Z', price: 5000, payment_status: 'unpaid', status: 'completed', route_id: null },
      { id: 'bk-b', tenant_id: B, start_time: '2026-01-02T00:00:00Z', price: 5000, payment_status: 'unpaid', status: 'completed', route_id: null },
    ],
    expenses: [
      { id: 'ex-a', tenant_id: A, date: '2026-01-02', category: 'c', amount: 50, description: 'a', vendor_name: 'A', matched_bank_transaction_id: null },
      { id: 'ex-b', tenant_id: B, date: '2026-01-02', category: 'c', amount: 50, description: 'b', vendor_name: 'B', matched_bank_transaction_id: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/reconcile-candidates GET — tenant isolation', () => {
  it('offers only the acting tenant\'s rows as reconcile candidates', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    for (const key of ['bank_transactions', 'invoices', 'bookings', 'expenses'] as const) {
      expect(body[key].length).toBe(1)
      expect(body[key].every((r: { tenant_id: string }) => r.tenant_id === A)).toBe(true)
    }
  })
})
