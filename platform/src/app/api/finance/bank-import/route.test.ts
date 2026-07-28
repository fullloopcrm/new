// @vitest-environment node
//
// multipart/form-data parsing requires Node's native undici File/FormData;
// jsdom's own File/FormData implementations aren't interoperable with it
// (see src/app/api/uploads/route.test.ts for the same pattern).
/**
 * Characterization tests for finance/bank-import POST — zero coverage before
 * this file despite being the entry point for every dollar that later gets
 * reconciled against the ledger (bank-transactions/suggest, /match, etc. all
 * operate on rows this route creates).
 *
 * Uses the REAL @/lib/bank-import (detectAndParse/parseCSV) and @/lib/ledger
 * (sha256File, transactionFingerprint) — both pure functions — so this proves
 * the route's dedup/persist logic against real parsing output, not a mock.
 *
 * Pins:
 *   - 400 on missing file / missing bank_account_id / file over 10MB
 *   - 404 when bank_account_id doesn't belong to the caller's tenant
 *   - 409 (with the previous batch) on re-uploading the exact same file bytes
 *     for the same bank account (sha256 dedup)
 *   - 400 on unparseable CSV and on a file with zero transactions
 *   - happy path: creates a bank_import_batches row, inserts one bank_transactions
 *     row per unique fingerprint, tenant-stamped
 *   - a transaction whose fingerprint already exists for this bank account
 *     (from a prior import) is counted as a duplicate and NOT re-inserted
 *   - two identical rows within the same file are deduped against each other too
 *   - an auth failure short-circuits before any query
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'
const BANK_ACCT = 'acct-1'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(async () => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null })),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { POST } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  h = createTenantDbHarness({
    bank_accounts: [{ id: BANK_ACCT, tenant_id: CTX_TENANT }],
    bank_import_batches: [],
    bank_transactions: [],
  })
  holder.from = h.from
})

const GOOD_CSV = 'Date,Description,Amount\n2026-07-01,Coffee Shop,-450\n2026-07-02,Client Payment,10000\n'

function makeRequest(fields: Record<string, string | File>): Request {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.append(k, v)
  return new Request('https://tenant.example.com/api/finance/bank-import', { method: 'POST', body: fd })
}

describe('POST /api/finance/bank-import', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: BANK_ACCT }))
    expect(res.status).toBe(403)
  })

  it('400s when no file is provided', async () => {
    const res = await POST(makeRequest({ bank_account_id: BANK_ACCT }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/file required/i)
  })

  it('400s when bank_account_id is missing', async () => {
    const res = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv') }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/bank_account_id required/i)
  })

  it('400s when the file exceeds 10MB', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.csv')
    const res = await POST(makeRequest({ file: big, bank_account_id: BANK_ACCT }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/exceeds 10 mb/i)
  })

  it('404s when bank_account_id does not belong to the caller\'s tenant', async () => {
    const res = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: 'someone-elses-acct' }))
    expect(res.status).toBe(404)
  })

  it('409s with the previous batch on re-uploading the exact same file for the same account', async () => {
    const first = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: BANK_ACCT }))
    expect(first.status).toBe(200)

    const second = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: BANK_ACCT }))
    expect(second.status).toBe(409)
    const body = await second.json()
    expect(body.error).toMatch(/already imported/i)
    expect(body.previous_batch).toBeDefined()
  })

  it('400s on a CSV missing required columns', async () => {
    const badCsv = 'Foo,Bar\n1,2\n'
    const res = await POST(makeRequest({ file: new File([badCsv], 'bad.csv'), bank_account_id: BANK_ACCT }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/missing required columns/i)
  })

  it('400s when the file parses to zero transactions', async () => {
    const headerOnly = 'Date,Description,Amount\n'
    const res = await POST(makeRequest({ file: new File([headerOnly], 'empty.csv'), bank_account_id: BANK_ACCT }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toMatch(/no transactions found/i)
  })

  it('happy path: creates a batch, inserts one tenant-stamped row per transaction, and reports counts', async () => {
    const res = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: BANK_ACCT }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, source: 'csv', rows_parsed: 2, accepted: 2, duplicates: 0 })
    expect(h.seed.bank_transactions).toHaveLength(2)
    for (const t of h.seed.bank_transactions) {
      expect(t.tenant_id).toBe(CTX_TENANT)
      expect(t.bank_account_id).toBe(BANK_ACCT)
      expect(t.import_batch_id).toBe(body.batch_id)
      expect(t.status).toBe('pending')
    }
    const batch = h.seed.bank_import_batches.find((b) => b.id === body.batch_id)
    expect(batch).toMatchObject({ tenant_id: CTX_TENANT, accepted_count: 2, duplicate_count: 0 })
  })

  it('dedupes a transaction whose fingerprint already exists for this bank account (prior import)', async () => {
    // Import once for real to get a genuine fingerprint into bank_transactions.
    await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: BANK_ACCT }))
    expect(h.seed.bank_transactions).toHaveLength(2)

    // Re-run against a DIFFERENT file (different bytes -> different sha256, so
    // it isn't caught by the whole-file 409) that repeats one of the same
    // transactions plus one genuinely new one.
    const secondCsv = 'Date,Description,Amount\n2026-07-01,Coffee Shop,-450\n2026-07-03,New Charge,-200\n'
    const res = await POST(makeRequest({ file: new File([secondCsv], 's2.csv'), bank_account_id: BANK_ACCT }))
    const body = await res.json()
    expect(body).toMatchObject({ accepted: 1, duplicates: 1 })
    expect(h.seed.bank_transactions).toHaveLength(3) // 2 from first import + 1 genuinely new
  })

  it('dedupes two identical rows within the same file against each other', async () => {
    const dupeCsv = 'Date,Description,Amount\n2026-07-01,Coffee Shop,-450\n2026-07-01,Coffee Shop,-450\n'
    const res = await POST(makeRequest({ file: new File([dupeCsv], 'dupe.csv'), bank_account_id: BANK_ACCT }))
    const body = await res.json()
    expect(body).toMatchObject({ rows_parsed: 2, accepted: 1, duplicates: 1 })
    expect(h.seed.bank_transactions).toHaveLength(1)
  })

  it('never reads or writes another tenant\'s bank account', async () => {
    h.seed.bank_accounts.push({ id: 'other-acct', tenant_id: 'tid-b' })
    const res = await POST(makeRequest({ file: new File([GOOD_CSV], 's.csv'), bank_account_id: 'other-acct' }))
    expect(res.status).toBe(404)
    expect(h.seed.bank_transactions).toHaveLength(0)
  })
})
