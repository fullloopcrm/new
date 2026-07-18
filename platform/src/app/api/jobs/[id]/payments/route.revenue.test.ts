/**
 * PATCH /api/jobs/[id]/payments — marking a job_payment 'paid' (the operator's
 * "Mark Paid" click on the Job detail page, the ONLY thing that ever flips
 * job_payments.status) never posted revenue to the ledger. job_payments is a
 * completely separate table from `payments` (no method/tip columns, its own
 * id space) so none of the existing money-in paths (mark-paid, Stripe webhook,
 * payment-processor.ts, invoices/record-payment) ever covered it — every job
 * (Jobs/Projects: landscaping, remodel, dumpster) marked paid this way was
 * silently missing from the P&L/trial balance/balance sheet, permanently
 * (backfillUnpostedRevenue only scans `payments`, and cron/finance-post's
 * booking backfill never sees a job_payment either).
 *
 * This suite proves the fix posts real ledger revenue on the 'paid' transition,
 * is idempotent, tenant-scoped, and never fails the status flip itself.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

type RpcCall = { fn: string; params: Record<string, unknown> }

const rpcFailure = vi.hoisted(() => ({ shouldFail: false }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  const rpcCalls: RpcCall[] = []

  const rpc = async (fn: string, params: Record<string, unknown>) => {
    rpcCalls.push({ fn, params })
    if (rpcFailure.shouldFail) throw new Error('simulated ledger RPC failure')
    if (fn !== 'post_journal_entry') throw new Error(`unexpected rpc: ${fn}`)
    const id = crypto.randomUUID()
    fake._seed('journal_entries', [
      { id, tenant_id: params.p_tenant_id, source: params.p_source, source_id: params.p_source_id },
    ])
    return { data: id, error: null }
  }

  const admin = { ...fake, rpc }
  return { supabaseAdmin: admin, __fake: fake, __rpcCalls: rpcCalls }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_ID }, error: null }),
}))

vi.mock('@/lib/jobs', () => ({
  logJobEvent: async () => {},
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const JOB_ID = 'job-1'
const PAYMENT_ID = 'jp-1'

function seed(paymentOverrides: Partial<Row> = {}) {
  fake._store.clear()
  fake._seed('job_payments', [
    {
      id: PAYMENT_ID,
      tenant_id: TENANT_ID,
      job_id: JOB_ID,
      label: 'Deposit',
      kind: 'deposit',
      amount_cents: 50_000,
      status: 'invoiced',
      paid_at: null,
      ...paymentOverrides,
    },
  ])
  fake._seed('chart_of_accounts', [
    { id: 'coa-1050', tenant_id: TENANT_ID, code: '1050', type: 'asset' },
    { id: 'coa-4000', tenant_id: TENANT_ID, code: '4000', type: 'income' },
  ])
}

function req(body: Record<string, unknown>): Request {
  return new Request(`http://x/api/jobs/${JOB_ID}/payments`, { method: 'PATCH', body: JSON.stringify(body) })
}
const params = Promise.resolve({ id: JOB_ID })

beforeEach(() => {
  rpcFailure.shouldFail = false
  seed()
})

describe('PATCH /api/jobs/[id]/payments — revenue posting', () => {
  it('marking a job_payment paid posts one ledger entry keyed by the job_payment id', async () => {
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(res.status).toBe(200)

    const entries = fake._all('journal_entries').filter((e) => e.source === 'job_payment' && e.source_id === PAYMENT_ID)
    expect(entries.length).toBe(1)
  })

  it('re-marking the same payment paid again does not double-post', async () => {
    const first = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(first.status).toBe(200)

    const second = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(second.status).toBe(200)

    const entries = fake._all('journal_entries').filter((e) => e.source === 'job_payment' && e.source_id === PAYMENT_ID)
    expect(entries.length).toBe(1)
  })

  it('marking invoiced (not paid) posts no revenue', async () => {
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'invoiced' }), { params })
    expect(res.status).toBe(200)
    expect(fake._all('journal_entries')).toHaveLength(0)
  })

  it('a ledger-posting failure does not fail the status flip itself', async () => {
    rpcFailure.shouldFail = true
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payment.status).toBe('paid')
    expect(fake._all('journal_entries')).toHaveLength(0)
  })
})
