// @vitest-environment node
/**
 * BANK IMPORT — duplicate rows are written, not dropped.
 *
 * Item (158): bank_transactions.status's declared 'duplicate' value
 * (032_ledger.sql) was permanently unreachable — this route silently
 * excluded fingerprint-matched rows from the insert entirely instead of
 * writing them with status:'duplicate'. A false-positive collision (two
 * legitimate transactions sharing date/amount/normalized description) was
 * silently and permanently lost with zero trace. Now every detected row is
 * written; duplicates are flagged, not dropped.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, role: 'owner', tenant: {} }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const ACCT_ID = 'acct-1'

function seedAccount() {
  fake._store.clear()
  fake._seed('bank_accounts', [{ id: ACCT_ID, tenant_id: TENANT_ID }])
}

function importRequest(csv: string): Request {
  const form = new FormData()
  form.set('bank_account_id', ACCT_ID)
  form.set('file', new File([csv], 'statement.csv', { type: 'text/csv' }))
  return new Request('http://x/api/finance/bank-import', { method: 'POST', body: form })
}

describe('POST /api/finance/bank-import — duplicate rows are written', () => {
  it('writes an intra-file fingerprint collision as status:duplicate instead of dropping it', async () => {
    seedAccount()
    const csv = [
      'Date,Description,Amount',
      '2026-07-17,Uber Ride,-15.00',
      '2026-07-17,Uber Ride,-15.00',
    ].join('\n')

    const res = await POST(importRequest(csv))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.accepted).toBe(1)
    expect(body.duplicates).toBe(1)

    const rows = fake._all('bank_transactions')
    expect(rows.length).toBe(2)
    expect(rows.filter(r => r.status === 'pending').length).toBe(1)
    expect(rows.filter(r => r.status === 'duplicate').length).toBe(1)
  })

  it('writes a cross-import fingerprint collision (already in bank_transactions) as status:duplicate', async () => {
    seedAccount()
    // First import establishes the accepted row + its real fingerprint.
    const csv = 'Date,Description,Amount\n2026-07-17,Rent,-1200.00\n'
    await POST(importRequest(csv))
    expect(fake._all('bank_transactions').filter(r => r.status === 'pending').length).toBe(1)

    // Second, separate import of the identical transaction (different file
    // bytes via an extra unrecognized column, so the exact-file-reupload
    // guard doesn't short-circuit before dedup even runs) must be flagged,
    // not silently dropped.
    const csv2 = 'Date,Description,Amount,Note\n2026-07-17,Rent,-1200.00,resubmission\n'
    const res2 = await POST(importRequest(csv2))
    const body2 = await res2.json()
    expect(body2.accepted).toBe(0)
    expect(body2.duplicates).toBe(1)

    const rows = fake._all('bank_transactions')
    expect(rows.filter(r => r.status === 'pending').length).toBe(1)
    expect(rows.filter(r => r.status === 'duplicate').length).toBe(1)
  })
})
