import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant foreign-key injection on POST /api/finance/chart-of-accounts.
 * FIXED: `body.parent_id` is now verified tenant-owned via tenantDb (which
 * auto-injects `.eq('tenant_id', tenantId)`) before insert, 400 on miss.
 *
 * `chart_of_accounts.parent_id` is a self-referencing FK (migration 032) with
 * no cross-tenant constraint — every sibling FK in this module (coa_id on
 * bank-accounts/bank-transactions, entity_id on expenses/periods/cpa-tokens)
 * already verifies ownership before write; this was the one FK in the family
 * still accepted verbatim.
 *
 * LOCK: proves a foreign parent_id is rejected (400), no account row created.
 * CONTROL: proves an own-tenant parent_id and the omitted path both still work.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' }, error: null })),
}))
vi.mock('@/lib/ledger', () => ({ seedChartOfAccounts: vi.fn(async () => []) }))

import { POST } from './route'

function seed() {
  return {
    chart_of_accounts: [
      { id: 'coa-a', tenant_id: A, code: '1000', name: 'Cash', type: 'asset' },
      { id: 'coa-b', tenant_id: B, code: '1000', name: 'Cash (other tenant)', type: 'asset' },
    ],
  }
}

function postReq(body: unknown): Request {
  return new Request('http://t/api/finance/chart-of-accounts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/chart-of-accounts POST — cross-tenant parent_id FK injection WITNESS', () => {
  it('LOCK: a foreign parent_id from the body is rejected (400), no account row created', async () => {
    const res = await POST(postReq({ code: '1010', name: 'Petty Cash', type: 'asset', parent_id: 'coa-b' }))
    expect(res.status).toBe(400)
    expect(h.capture.inserts.find((i) => i.table === 'chart_of_accounts')).toBeUndefined()
  })

  it('CONTROL: with no parent_id, the account is stored with a null parent_id (safe path)', async () => {
    const res = await POST(postReq({ code: '1010', name: 'Petty Cash', type: 'asset' }))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find((i) => i.table === 'chart_of_accounts')!.rows[0]
    expect(row.tenant_id).toBe(A)
    expect(row.parent_id).toBeNull()
  })

  it('CONTROL: an explicit own-tenant parent_id passes the ownership check', async () => {
    const res = await POST(postReq({ code: '1010', name: 'Petty Cash', type: 'asset', parent_id: 'coa-a' }))
    expect(res.status).toBe(200)
    const row = h.capture.inserts.find((i) => i.table === 'chart_of_accounts')!.rows[0]
    expect(row.tenant_id).toBe(A)
    expect(row.parent_id).toBe('coa-a')
  })
})
