/**
 * Characterization tests for finance/receipts/attach POST — real money
 * movement (posting a journal entry when a receipt is categorized).
 * Coverage before this file: 41.30% statements.
 *
 * postJournalEntry is mocked (its own posting/idempotency logic is covered
 * by ledger.test.ts and the post-*.test.ts suites) — this file proves the
 * ROUTE calls it with the right debit/credit direction and only when it
 * should, using tenantDb (built on the same @/lib/supabase the harness
 * models, see tenant-db.ts) against tenant-isolation-harness.
 *
 * Pins:
 *   - 400 when bank_transaction_id or receipt_path is missing
 *   - 404 when the transaction doesn't resolve for this tenant
 *   - no coa_id: only receipt_path/receipt_extracted are saved, no posting
 *   - coa_id + status=pending, OUTFLOW (amount_cents < 0): DR coa_id / CR bank's coa
 *   - coa_id + status=pending, INFLOW (amount_cents > 0): DR bank's coa / CR coa_id
 *   - 400 when coa_id isn't owned by this tenant
 *   - 400 when the bank account has no coa_id link
 *   - coa_id supplied but txn.status is already NOT pending: receipt fields
 *     still save, but no re-posting and coa_id/status/journal_entry_id are
 *     left untouched
 *   - a concurrent double-post (postJournalEntry returns null) still saves
 *     the receipt fields but leaves coa_id/status/journal_entry_id alone
 *   - categorization_patterns: creates a new row on first use, bumps
 *     hit_count on repeat
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(async () => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null })),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

const postJournalEntryMock = vi.hoisted(() => vi.fn(async () => 'je-1'))
vi.mock('@/lib/ledger', async () => {
  const actual = await vi.importActual<typeof import('@/lib/ledger')>('@/lib/ledger')
  return { ...actual, postJournalEntry: postJournalEntryMock }
})

import { POST } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  postJournalEntryMock.mockReset()
  postJournalEntryMock.mockResolvedValue('je-1')
  h = createTenantDbHarness({ bank_transactions: [], chart_of_accounts: [], categorization_patterns: [] })
  holder.from = h.from
})

function postReq(body: unknown): Request {
  return new Request('http://t', { method: 'POST', body: JSON.stringify(body) })
}

function seedTxn(id: string, fields: Record<string, unknown>) {
  h.seed.bank_transactions.push({
    id, tenant_id: CTX_TENANT, txn_date: '2026-07-01', description: 'AMAZON WEB SVCS 12345678', amount_cents: -5000,
    status: 'pending', bank_account_id: 'acct-1', bank_accounts: { coa_id: 'coa-bank' },
    ...fields,
  })
}

describe('POST /api/finance/receipts/attach', () => {
  it('400s when bank_transaction_id is missing', async () => {
    const res = await POST(postReq({ receipt_path: 'r.pdf' }))
    expect(res.status).toBe(400)
  })

  it('400s when receipt_path is missing', async () => {
    const res = await POST(postReq({ bank_transaction_id: 'txn-1' }))
    expect(res.status).toBe(400)
  })

  it('404s when the transaction does not resolve for this tenant', async () => {
    const res = await POST(postReq({ bank_transaction_id: 'nope', receipt_path: 'r.pdf' }))
    expect(res.status).toBe(404)
  })

  it('with no coa_id: saves receipt fields only, posts nothing', async () => {
    seedTxn('txn-1', {})
    const res = await POST(postReq({ bank_transaction_id: 'txn-1', receipt_path: 'r.pdf', extracted: { total: 50 } }))
    expect(res.status).toBe(200)
    expect(postJournalEntryMock).not.toHaveBeenCalled()
    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-1')!
    expect(txn.receipt_path).toBe('r.pdf')
    expect(txn.receipt_extracted).toEqual({ total: 50 })
    expect(txn.status).toBe('pending') // untouched
  })

  it('OUTFLOW (negative amount_cents): posts DR coa_id / CR bank coa', async () => {
    seedTxn('txn-out', { amount_cents: -5000 })
    h.seed.chart_of_accounts.push({ id: 'coa-expense', tenant_id: CTX_TENANT })
    await POST(postReq({ bank_transaction_id: 'txn-out', receipt_path: 'r.pdf', coa_id: 'coa-expense' }))
    expect(postJournalEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'bank_txn',
        source_id: 'txn-out',
        lines: [
          { coa_id: 'coa-expense', debit_cents: 5000 },
          { coa_id: 'coa-bank', credit_cents: 5000 },
        ],
      }),
    )
    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-out')!
    expect(txn).toMatchObject({ status: 'posted', coa_id: 'coa-expense', journal_entry_id: 'je-1' })
  })

  it('INFLOW (positive amount_cents): posts DR bank coa / CR coa_id', async () => {
    seedTxn('txn-in', { amount_cents: 3000 })
    h.seed.chart_of_accounts.push({ id: 'coa-income', tenant_id: CTX_TENANT })
    await POST(postReq({ bank_transaction_id: 'txn-in', receipt_path: 'r.pdf', coa_id: 'coa-income' }))
    expect(postJournalEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        lines: [
          { coa_id: 'coa-bank', debit_cents: 3000 },
          { coa_id: 'coa-income', credit_cents: 3000 },
        ],
      }),
    )
  })

  it('400s when coa_id is not owned by this tenant', async () => {
    seedTxn('txn-badcoa', {})
    // no matching chart_of_accounts row seeded for 'coa-foreign'
    const res = await POST(postReq({ bank_transaction_id: 'txn-badcoa', receipt_path: 'r.pdf', coa_id: 'coa-foreign' }))
    expect(res.status).toBe(400)
    expect(postJournalEntryMock).not.toHaveBeenCalled()
  })

  it('400s when the bank account has no coa_id link', async () => {
    seedTxn('txn-nolink', { bank_accounts: { coa_id: null } })
    h.seed.chart_of_accounts.push({ id: 'coa-expense', tenant_id: CTX_TENANT })
    const res = await POST(postReq({ bank_transaction_id: 'txn-nolink', receipt_path: 'r.pdf', coa_id: 'coa-expense' }))
    expect(res.status).toBe(400)
    expect(postJournalEntryMock).not.toHaveBeenCalled()
  })

  it('a coa_id on an already-posted transaction (status != pending) does not re-post, only saves receipt fields', async () => {
    seedTxn('txn-already', { status: 'posted', coa_id: 'coa-old', journal_entry_id: 'je-old' })
    h.seed.chart_of_accounts.push({ id: 'coa-expense', tenant_id: CTX_TENANT })
    const res = await POST(postReq({ bank_transaction_id: 'txn-already', receipt_path: 'r.pdf', coa_id: 'coa-expense' }))
    expect(res.status).toBe(200)
    expect(postJournalEntryMock).not.toHaveBeenCalled()
    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-already')!
    expect(txn).toMatchObject({ status: 'posted', coa_id: 'coa-old', journal_entry_id: 'je-old', receipt_path: 'r.pdf' })
  })

  it('a concurrent double-post (postJournalEntry -> null) still saves the receipt but leaves coa_id/status alone', async () => {
    seedTxn('txn-race', {})
    h.seed.chart_of_accounts.push({ id: 'coa-expense', tenant_id: CTX_TENANT })
    postJournalEntryMock.mockResolvedValueOnce(null)
    const res = await POST(postReq({ bank_transaction_id: 'txn-race', receipt_path: 'r.pdf', coa_id: 'coa-expense' }))
    expect(res.status).toBe(200)
    const txn = h.seed.bank_transactions.find((t) => t.id === 'txn-race')!
    expect(txn.receipt_path).toBe('r.pdf')
    expect(txn.status).toBe('pending') // NOT flipped to posted
    expect(txn.coa_id).toBeUndefined()
  })

  it('categorization_patterns: creates a new row on first use', async () => {
    // normalizeDescription lowercases, collapses whitespace, and collapses any
    // run of 4+ digits to a single '#' (e.g. "#12345" -> "##" — the literal
    // '#' plus the collapsed digit run's own '#').
    seedTxn('txn-pat1', { description: 'STARBUCKS #12345' })
    h.seed.chart_of_accounts.push({ id: 'coa-meals', tenant_id: CTX_TENANT })
    await POST(postReq({ bank_transaction_id: 'txn-pat1', receipt_path: 'r.pdf', coa_id: 'coa-meals' }))
    const pattern = h.seed.categorization_patterns.find((p) => p.coa_id === 'coa-meals')!
    expect(pattern).toMatchObject({ tenant_id: CTX_TENANT, hit_count: 1, pattern: 'starbucks ##' })
  })

  it('categorization_patterns: bumps hit_count on repeat', async () => {
    h.seed.categorization_patterns.push({ id: 'pat-1', tenant_id: CTX_TENANT, pattern: 'starbucks ##', coa_id: 'coa-meals', hit_count: 3 })
    seedTxn('txn-pat2', { description: 'STARBUCKS #99999' })
    h.seed.chart_of_accounts.push({ id: 'coa-meals', tenant_id: CTX_TENANT })
    await POST(postReq({ bank_transaction_id: 'txn-pat2', receipt_path: 'r.pdf', coa_id: 'coa-meals' }))
    const pattern = h.seed.categorization_patterns.find((p) => p.id === 'pat-1')!
    expect(pattern.hit_count).toBe(4)
  })

  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await POST(postReq({ bank_transaction_id: 'txn-1', receipt_path: 'r.pdf' }))
    expect(res.status).toBe(403)
  })
})
