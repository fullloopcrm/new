/**
 * LEDGER DOUBLE-POST RACE — `postPayoutToLedger` / `postPayrollToLedger`.
 *
 * post-revenue.ts has a race test proving the double-post guard
 * (idx_journal_entries_source_unique; migration 064's post_journal_entry RPC
 * resolves the dedupe claim internally and returns NULL, treated as
 * already_posted) holds under concurrency. post-labor.ts shares the exact
 * same guard (via the
 * shared `postLabor()` helper) but had zero test coverage of its own — a
 * payout/payroll webhook redelivery racing a backfill run is exactly the
 * kind of concurrent double-pay this guard exists to prevent, and it was
 * unverified. This suite closes that gap for both labor posting paths, plus
 * the W-2 vs 1099 account routing `postPayoutToLedger` depends on.
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
      // migration 064: the RPC resolves the dedupe claim internally and
      // returns NULL, not a 23505 error, for the losing concurrent caller.
      return { data: null, error: null }
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
import { postPayoutToLedger, postPayrollToLedger } from './post-labor'

const TENANT_ID = 'tenant-1'
const PAYOUT_ID = 'payout-1'
const PAYROLL_ID = 'payroll-1'
const TEAM_MEMBER_ID = 'tm-1'

function seedChart(overrides: Row[] = []) {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._seed('chart_of_accounts', [
    { id: 'coa-5000', tenant_id: TENANT_ID, code: '5000', type: 'expense' },
    { id: 'coa-5010', tenant_id: TENANT_ID, code: '5010', type: 'expense' },
    { id: 'coa-2450', tenant_id: TENANT_ID, code: '2450', type: 'liability' },
    ...overrides,
  ])
}

function seedPayout(overrides: Partial<Row> = {}) {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._seed('team_member_payouts', [
    {
      id: PAYOUT_ID,
      tenant_id: TENANT_ID,
      team_member_id: TEAM_MEMBER_ID,
      amount_cents: 5000,
      tip_cents: 500,
      status: 'transferred',
      ...overrides,
    },
  ])
}

function seedPayroll(overrides: Partial<Row> = {}) {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._seed('payroll_payments', [
    { id: PAYROLL_ID, tenant_id: TENANT_ID, team_member_id: TEAM_MEMBER_ID, amount: 8000, ...overrides },
  ])
}

beforeEach(() => {
  const f = supabaseAdmin as unknown as FakeSupabase
  f._store.clear()
  ;(supabaseModule as unknown as { __postedKeys: Set<string> }).__postedKeys.clear()
  ;(supabaseModule as unknown as { __rpcCalls: RpcCall[] }).__rpcCalls.length = 0
  seedChart()
})

describe('postPayoutToLedger — concurrent double-post race', () => {
  it('two concurrent posts for the same payout produce exactly one journal entry', async () => {
    seedPayout()
    const results = await Promise.all([
      postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID }),
      postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID }),
    ])

    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === PAYOUT_ID).length).toBe(1)

    const posted = results.filter((r) => r.posted)
    const skipped = results.filter((r) => !r.posted)
    expect(posted.length).toBe(1)
    expect(skipped.length).toBe(1)
    expect(skipped[0].reason).toBe('already_posted')
  })

  it('a sequential retry after the first post lands is idempotent', async () => {
    seedPayout()
    const first = await postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID })
    expect(first.posted).toBe(true)

    const second = await postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID })
    expect(second.posted).toBe(false)
    expect(second.reason).toBe('already_posted')
  })
})

describe('postPayoutToLedger — account routing', () => {
  it('routes a 1099 contractor (no HR profile) to 5000 Contractor Pay', async () => {
    seedPayout()
    const result = await postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID })
    expect(result.posted).toBe(true)

    const f = supabaseAdmin as unknown as FakeSupabase
    const rpcCalls = (supabaseModule as unknown as { __rpcCalls: RpcCall[] }).__rpcCalls
    const call = rpcCalls.find((c) => c.params.p_source_id === PAYOUT_ID)
    const lines = call?.params.p_lines as Array<{ coa_id: string; debit_cents: number }>
    expect(lines.some((l) => l.coa_id === 'coa-5000' && l.debit_cents === 5500)).toBe(true)
    void f
  })

  it('routes a W-2 employee to 5010 Wages', async () => {
    const f = supabaseAdmin as unknown as FakeSupabase
    f._seed('hr_employee_profiles', [{ tenant_id: TENANT_ID, team_member_id: TEAM_MEMBER_ID, employment_type: 'employee_w2' }])
    seedPayout()

    const result = await postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID })
    expect(result.posted).toBe(true)

    const rpcCalls = (supabaseModule as unknown as { __rpcCalls: RpcCall[] }).__rpcCalls
    const call = rpcCalls.find((c) => c.params.p_source_id === PAYOUT_ID)
    const lines = call?.params.p_lines as Array<{ coa_id: string; debit_cents: number }>
    expect(lines.some((l) => l.coa_id === 'coa-5010')).toBe(true)
  })

  it('does not post a payout that has not actually transferred yet', async () => {
    seedPayout({ status: 'pending' })
    const result = await postPayoutToLedger({ tenantId: TENANT_ID, payoutId: PAYOUT_ID })
    expect(result.posted).toBe(false)
    expect(result.reason).toBe('status_pending')
  })

  it('returns not_found for an unknown payout id', async () => {
    const result = await postPayoutToLedger({ tenantId: TENANT_ID, payoutId: 'missing' })
    expect(result.posted).toBe(false)
    expect(result.reason).toBe('not_found')
  })
})

describe('postPayrollToLedger — concurrent double-post race', () => {
  it('two concurrent posts for the same payroll payment produce exactly one journal entry', async () => {
    seedPayroll()
    const results = await Promise.all([
      postPayrollToLedger({ tenantId: TENANT_ID, payrollPaymentId: PAYROLL_ID }),
      postPayrollToLedger({ tenantId: TENANT_ID, payrollPaymentId: PAYROLL_ID }),
    ])

    const f = supabaseAdmin as unknown as FakeSupabase
    expect(f._all('journal_entries').filter((e) => e.source_id === PAYROLL_ID).length).toBe(1)
    expect(results.filter((r) => r.posted).length).toBe(1)
    expect(results.filter((r) => !r.posted)[0].reason).toBe('already_posted')
  })
})
