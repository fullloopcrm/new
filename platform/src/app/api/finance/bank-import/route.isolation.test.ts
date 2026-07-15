// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it.
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — POST /api/finance/bank-import.
 *
 * The route resolves `bank_account_id` via a raw `supabaseAdmin` query
 * (`.eq('tenant_id', tenantId).eq('id', bankAccountId)`), not `tenantDb`, so
 * it's worth its own probe: a caller-supplied `bank_account_id` belonging to
 * another tenant must 404 before any parse/insert happens — never silently
 * import a foreign tenant's statement into their account, and never leak
 * whether the id exists at all.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: A }, error: null })),
}))

import { POST } from './route'

const CSV = 'Date,Description,Amount\n2026-07-01,Test Transaction,-50.00\n'

function seed() {
  return {
    bank_accounts: [
      { id: 'acct-a', tenant_id: A },
      { id: 'acct-b', tenant_id: B },
    ],
    bank_import_batches: [],
    bank_transactions: [],
  }
}

function postImport(bankAccountId: string) {
  const form = new FormData()
  form.set('file', new File([CSV], 'statement.csv', { type: 'text/csv' }))
  form.set('bank_account_id', bankAccountId)
  return POST(new Request('http://t/api/finance/bank-import', { method: 'POST', body: form }))
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('finance/bank-import POST — tenant isolation', () => {
  it("wrong-tenant probe: rejects a bank_account_id belonging to a different tenant, no rows inserted", async () => {
    const res = await postImport('acct-b')
    expect(res.status).toBe(404)
    expect(h.capture.inserts.filter(i => i.table === 'bank_import_batches')).toHaveLength(0)
    expect(h.capture.inserts.filter(i => i.table === 'bank_transactions')).toHaveLength(0)
  })

  it("positive control: accepts the caller's own bank_account_id and stamps tenant_id on every insert", async () => {
    const res = await postImport('acct-a')
    expect(res.status).toBe(200)
    const batchInserts = h.capture.inserts.filter(i => i.table === 'bank_import_batches')
    const txnInserts = h.capture.inserts.filter(i => i.table === 'bank_transactions')
    expect(batchInserts).toHaveLength(1)
    expect(batchInserts[0].rows[0].tenant_id).toBe(A)
    expect(txnInserts).toHaveLength(1)
    expect(txnInserts[0].rows.every(r => r.tenant_id === A)).toBe(true)
  })
})
