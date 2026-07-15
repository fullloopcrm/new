import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/finance/chart-of-accounts (converted to tenantDb).
 *
 * GET reads `chart_of_accounts` through tenantDb (foreign accounts filtered out);
 * POST inserts through tenantDb, which stamps tenant_id last so a forged body
 * value can't plant a row under another tenant.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))
// POST calls seedChartOfAccounts only when body.seed_defaults is set — not this test.
vi.mock('@/lib/ledger', () => ({ seedChartOfAccounts: vi.fn(async () => []) }))

import { GET, POST } from './route'

function seed() {
  return {
    chart_of_accounts: [
      { id: 'coa-a', tenant_id: A, code: '1000', name: 'Cash', type: 'asset' },
      { id: 'coa-b', tenant_id: B, code: '1000', name: 'Cash (other tenant)', type: 'asset' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/chart-of-accounts — tenant isolation', () => {
  it("GET returns only the acting tenant's accounts", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.accounts as Array<{ id: string }>).map((a) => a.id)
    expect(ids).toEqual(['coa-a'])
    expect(ids).not.toContain('coa-b')
  })

  it('POST stamps the acting tenant even when the body forges a foreign tenant_id', async () => {
    const req = new Request('http://t/api/finance/chart-of-accounts', {
      method: 'POST',
      body: JSON.stringify({ tenant_id: B, code: '2000', name: 'Loans', type: 'liability' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.account.tenant_id).toBe(A)
    // The row that actually hit the table was stamped for A, not the forged B.
    const inserted = h.capture.inserts.find((i) => i.table === 'chart_of_accounts')
    expect(inserted?.rows[0].tenant_id).toBe(A)
  })
})
