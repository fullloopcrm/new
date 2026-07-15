/**
 * LEDGER DOUBLE-POST RACE — deposit / refund / chargeback / commission posters.
 *
 * post-adjustments.ts shares the exact same double-post guard as
 * post-revenue.ts and post-labor.ts (journalEntryExists fast-path +
 * postJournalEntry's unique-constraint INSERT as the atomic decision point,
 * 23505 caught as already_posted) but had zero test coverage — a Stripe
 * refund/dispute webhook redelivery is exactly the concurrent-double-post
 * case this guard exists for, and for four separate money-moving functions
 * it was unverified. This suite closes that gap.
 *
 * Mocks `supabaseAdmin.rpc` directly (the shared fake-supabase.ts harness
 * doesn't model RPC calls), matching post-revenue-race.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

type RpcCall = { fn: string; params: Record<string, unknown> }

vi.mock('../supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const postedKeys = new Set<string>()
  const rpcCalls: RpcCall[] = []

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params })
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
    const key = `${params.p_tenant_id}|${params.p_source}|${params.p_source_id}`
    if (params.p_source_id && postedKeys.has(key)) {
      return {
        data: null,
        error: { message: 'duplicate key value violates unique constraint "idx_journal_entries_source_unique"', code: '23505' },
      }
    }
    if (params.p_source_id) postedKeys.add(key)
    const id = crypto.randomUUID()
    fake._seed('journal_entries', [
      { id, tenant_id: params.p_tenant_id, source: params.p_source, source_id: params.p_source_id },
    ])
    return { data: id, error: null }
  }

  const admin = { ...fake, rpc }
  return { supabase: admin, supabaseAdmin: admin, __fake: fake, __rpcCalls: rpcCalls, __postedKeys: postedKeys }
})

import { supabaseAdmin } from '../supabase'
import * as supabaseModule from '../supabase'
import {
  postDepositToLedger,
  postRefundToLedger,
  postChargebackToLedger,
  postCommissionAccrual,
  postCommissionPayment,
} from './post-adjustments'

const TENANT_ID = 'tenant-1'
const SOURCE_ID = 'src-1'
const COMMISSION_ID = 'commission-1'

function seedChart() {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-2350', tenant_id: TENANT_ID, code: '2350', type: 'liability' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
    { id: 'coa-6110', tenant_id: TENANT_ID, code: '6110', type: 'expense' },
    { id: 'coa-6045', tenant_id: TENANT_ID, code: '6045', type: 'expense' },
    { id: 'coa-2400', tenant_id: TENANT_ID, code: '2400', type: 'liability' },
    { id: 'coa-1010', tenant_id: TENANT_ID, code: '1010', type: 'asset' },
  ])
}

function seedCommission(overrides: Partial<Row> = {}) {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._seed('referral_commissions', [
    { id: COMMISSION_ID, tenant_id: TENANT_ID, commission_cents: 1500, status: 'earned', ...overrides },
  ])
}

beforeEach(() => {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._store.clear()
  ;(supabaseModule as unknown as { __postedKeys: Set<string> }).__postedKeys.clear()
  ;(supabaseModule as unknown as { __rpcCalls: RpcCall[] }).__rpcCalls.length = 0
  seedChart()
})

describe('postDepositToLedger — concurrent double-post race', () => {
  it('two concurrent deposits for the same source produce exactly one journal entry', async () => {
    const results = await Promise.all([
      postDepositToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 20_000 }),
      postDepositToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 20_000 }),
    ])
    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === SOURCE_ID).length).toBe(1)
    expect(results.filter((r) => r.posted).length).toBe(1)
    expect(results.filter((r) => !r.posted)[0].reason).toBe('already_posted')
  })

  it('rejects a zero/negative amount before touching the ledger', async () => {
    const result = await postDepositToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 0 })
    expect(result).toEqual({ posted: false, reason: 'zero_amount' })
  })
})

describe('postRefundToLedger — concurrent double-post race', () => {
  it('two concurrent refunds for the same Stripe refund id produce exactly one journal entry', async () => {
    const results = await Promise.all([
      postRefundToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 10_000 }),
      postRefundToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 10_000 }),
    ])
    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === SOURCE_ID).length).toBe(1)
    expect(results.filter((r) => r.posted).length).toBe(1)
  })
})

describe('postChargebackToLedger — concurrent double-post race', () => {
  it('two concurrent chargebacks for the same dispute id produce exactly one journal entry', async () => {
    const results = await Promise.all([
      postChargebackToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 5_000 }),
      postChargebackToLedger({ tenantId: TENANT_ID, sourceId: SOURCE_ID, amountCents: 5_000 }),
    ])
    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === SOURCE_ID).length).toBe(1)
    expect(results.filter((r) => r.posted).length).toBe(1)
  })
})

describe('postCommissionAccrual / postCommissionPayment', () => {
  it('two concurrent accrual posts for the same commission produce exactly one journal entry', async () => {
    seedCommission()
    const results = await Promise.all([
      postCommissionAccrual({ tenantId: TENANT_ID, commissionId: COMMISSION_ID }),
      postCommissionAccrual({ tenantId: TENANT_ID, commissionId: COMMISSION_ID }),
    ])
    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === COMMISSION_ID && e.source === 'commission').length).toBe(1)
    expect(results.filter((r) => r.posted).length).toBe(1)
  })

  it('does not accrue a voided commission', async () => {
    seedCommission({ status: 'void' })
    const result = await postCommissionAccrual({ tenantId: TENANT_ID, commissionId: COMMISSION_ID })
    expect(result).toEqual({ posted: false, reason: 'void' })
  })

  it('payment ensures the accrual exists first, then clears the payable — two concurrent payments post exactly once', async () => {
    seedCommission({ status: 'paid' })
    const results = await Promise.all([
      postCommissionPayment({ tenantId: TENANT_ID, commissionId: COMMISSION_ID }),
      postCommissionPayment({ tenantId: TENANT_ID, commissionId: COMMISSION_ID }),
    ])
    const f = supabaseAdmin as unknown as FakeSupabase
    // One accrual entry (source='commission') + exactly one payment entry (source='commission_paid').
    expect(f._all('journal_entries').filter((e) => e.source_id === COMMISSION_ID && e.source === 'commission').length).toBe(1)
    expect(f._all('journal_entries').filter((e) => e.source_id === COMMISSION_ID && e.source === 'commission_paid').length).toBe(1)
    expect(results.filter((r) => r.posted).length).toBe(1)
  })
})
