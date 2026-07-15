import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * WITNESS — cross-tenant coa_id FK injection on PATCH /api/finance/bank-accounts/[id].
 *
 * HARD-tier, BANK. `coa_id` is in the PATCH allow-list, but until this fix no
 * ownership check ran before the update. `chart_of_accounts` carries its own
 * tenant_id, and GET /api/finance/bank-accounts embeds chart_of_accounts(code,
 * name, type) off this row — so a foreign coa_id would repoint A's own bank
 * account at B's GL account and leak its name back to A on the next read.
 * Same exfil shape as the POST route's register-P4 fix, just via PATCH.
 *
 * FIXED: a caller-supplied coa_id is now verified tenant-owned
 * (`.eq('id',...).eq('tenant_id', tenantId)`) before the update runs; 404 on miss.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
  return { AuthError, getTenantForRequest: vi.fn() }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  })),
}))

import { PATCH } from './route'

function seed() {
  return {
    bank_accounts: [
      { id: 'bank-a', tenant_id: CTX_TENANT, name: 'Ops Checking', coa_id: 'coa-a' },
    ],
    chart_of_accounts: [
      { id: 'coa-a', tenant_id: CTX_TENANT, code: '1010', name: 'A-Cash' },
      { id: 'coa-b', tenant_id: OTHER_TENANT, code: '1010', name: 'B-Cash' },
    ],
  }
}

function patchReq(body: unknown): Request {
  return { url: 'http://x/api/finance/bank-accounts/bank-a', json: async () => body } as unknown as Request
}
function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/bank-accounts/[id] PATCH — coa_id FK injection WITNESS', () => {
  it('LOCK: a foreign coa_id is rejected (400), bank account untouched', async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-b' }), ctx('bank-a'))
    expect(res.status).toBe(400)

    const upd = h.capture.updates.find((u) => u.table === 'bank_accounts')
    expect(upd).toBeFalsy()
    const row = h.seed.bank_accounts.find((r) => r.id === 'bank-a')!
    expect(row.coa_id).toBe('coa-a')
  })

  it('CONTROL: an explicit own-tenant coa_id passes the ownership check', async () => {
    const res = await PATCH(patchReq({ coa_id: 'coa-a', name: 'Updated' }), ctx('bank-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bank_accounts')
    expect(upd!.matched[0].coa_id).toBe('coa-a')
    expect(upd!.matched[0].name).toBe('Updated')
  })

  it('CONTROL: omitting coa_id still allows an unrelated field update', async () => {
    const res = await PATCH(patchReq({ name: 'Renamed' }), ctx('bank-a'))
    expect(res.status).toBe(200)
    const upd = h.capture.updates.find((u) => u.table === 'bank_accounts')
    expect(upd!.matched[0].name).toBe('Renamed')
  })
})
