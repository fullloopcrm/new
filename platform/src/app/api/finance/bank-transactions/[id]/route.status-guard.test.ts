/**
 * BANK-TXN CATEGORIZE — status guard.
 *
 * Continues the (150)-shaped surface from the match route's revenue fix:
 * once a bank transaction is matched to an invoice/booking, that match now
 * posts revenue to the GL immediately (source='payment'/'booking'). This
 * PATCH route (the "categorize" action) had no idea that could have already
 * happened — it posted a second journal entry unconditionally (source=
 * 'bank_txn'), regardless of the transaction's status. Before the match
 * route posted revenue in real time this only produced a lonely, unlinked
 * entry; now it would double-count the same real-world deposit. Mirrors the
 * guard match/route.ts already has for the reverse case (re-matching an
 * already-matched/posted transaction).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpc = async (fn: string, params: Record<string, unknown>) => {
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
    const id = crypto.randomUUID()
    fake._seed('journal_entries', [{ id, tenant_id: params.p_tenant_id, source: params.p_source, source_id: params.p_source_id }])
    return { data: id, error: null }
  }
  const admin = { ...fake, rpc }
  return { supabase: admin, supabaseAdmin: admin, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID, role: 'owner', tenant: {} }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const TENANT_ID = 'tenant-1'
const TXN_ID = 'txn-1'
const COA_ID = 'coa-expense'

function seed(status: string, overrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('bank_transactions', [
    {
      id: TXN_ID,
      tenant_id: TENANT_ID,
      txn_date: '2026-07-17',
      description: 'Client payment',
      amount_cents: 20_000,
      status,
      matched_invoice_id: status === 'matched' ? 'invoice-1' : null,
      bank_account_id: 'acct-1',
      bank_accounts: { coa_id: 'coa-bank' },
      ...overrides,
    },
  ])
  fake._seed('chart_of_accounts', [{ id: COA_ID, tenant_id: TENANT_ID, code: '6000', name: 'Supplies' }])
}

function patchRequest(body: Record<string, unknown>) {
  return new Request(`http://x/api/finance/bank-transactions/${TXN_ID}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

describe('PATCH /api/finance/bank-transactions/[id] — status guard', () => {
  it('rejects categorizing a transaction already matched to an invoice/booking', async () => {
    seed('matched')
    const res = await PATCH(patchRequest({ coa_id: COA_ID }), { params: Promise.resolve({ id: TXN_ID }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Already matched')
    expect(fake._all('journal_entries').length).toBe(0)
  })

  it('rejects categorizing an already-posted transaction', async () => {
    seed('posted')
    const res = await PATCH(patchRequest({ coa_id: COA_ID }), { params: Promise.resolve({ id: TXN_ID }) })
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('Already posted')
    expect(fake._all('journal_entries').length).toBe(0)
  })

  it('still allows categorizing a pending transaction (regression check)', async () => {
    seed('pending')
    const res = await PATCH(patchRequest({ coa_id: COA_ID }), { params: Promise.resolve({ id: TXN_ID }) })
    expect(res.status).toBe(200)
    expect(fake._all('journal_entries').length).toBe(1)
    const txnRow = fake._all('bank_transactions').find((t) => t.id === TXN_ID)
    expect(txnRow?.status).toBe('posted')
  })

  it('still allows ignoring a pending transaction (regression check, unaffected by the new guard)', async () => {
    seed('pending')
    const res = await PATCH(patchRequest({ status: 'ignored' }), { params: Promise.resolve({ id: TXN_ID }) })
    expect(res.status).toBe(200)
    const txnRow = fake._all('bank_transactions').find((t) => t.id === TXN_ID)
    expect(txnRow?.status).toBe('ignored')
  })
})
