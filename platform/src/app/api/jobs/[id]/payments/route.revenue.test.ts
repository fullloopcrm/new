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

// Injected right after the route's initial job_payments read resolves --
// simulates a concurrent PATCH (a second click, another admin) that already
// landed between this request's read and its own write. Fire-once, same
// convention as team-portal/jobs/reassign/route.race.test.ts.
const afterPaymentRead = vi.hoisted(() => ({ fn: null as (() => void) | null }))

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

  // Only the route's initial `.select('status')...maybeSingle()` read goes
  // through `.select()` -- the CAS write below uses `.update()`, a separate
  // QueryBuilder -- so wrapping just the select path fires the injected
  // mutation exactly once, between the read and the write, and never touches
  // the write's own resolution.
  const from = (table: string) => {
    const builder = fake.from(table)
    if (table !== 'job_payments') return builder
    // Mutate the instance directly (not a spread copy) -- FromBuilder's
    // other methods (update/insert/delete/upsert) live on the prototype, so
    // a `{...builder}` shallow copy silently drops them.
    const origSelect = builder.select.bind(builder)
    builder.select = ((...args: Parameters<typeof origSelect>) => {
      const qb = origSelect(...args)
      const origMaybeSingle = qb.maybeSingle.bind(qb)
      qb.maybeSingle = async () => {
        const res = await origMaybeSingle()
        afterPaymentRead.fn?.()
        afterPaymentRead.fn = null
        return res
      }
      return qb
    }) as typeof builder.select
    return builder
  }

  const admin = { ...fake, from, rpc }
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
  afterPaymentRead.fn = null
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

describe('PATCH /api/jobs/[id]/payments — write-write race (CAS)', () => {
  it('404s when payment_id does not belong to this job/tenant', async () => {
    const res = await PATCH(req({ payment_id: 'nope', status: 'paid' }), { params })
    expect(res.status).toBe(404)
  })

  it('409s instead of silently clobbering a status a concurrent request already changed', async () => {
    // This request reads 'invoiced' and intends to move it to 'paid'. Before
    // this request's own write reaches the DB, a concurrent request (another
    // admin, a second click) already moved the SAME row to 'void'. Pre-fix,
    // the blind `.update({ status: 'paid' })` had no WHERE on status at all,
    // so it would silently resurrect a voided payment back to 'paid'.
    afterPaymentRead.fn = () => {
      fake._store.get('job_payments')![0].status = 'void'
    }
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(res.status).toBe(409)

    // The concurrent winner's state must survive untouched.
    expect(fake._store.get('job_payments')![0].status).toBe('void')
    expect(fake._all('journal_entries')).toHaveLength(0)
  })

  it('still updates normally with no concurrent writer (no regression)', async () => {
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(res.status).toBe(200)
    expect(fake._store.get('job_payments')![0].status).toBe('paid')
  })
})

describe('PATCH /api/jobs/[id]/payments — void reverses previously-posted revenue', () => {
  it('voiding a paid payment posts a reversing entry (DR 4000 / CR 1050)', async () => {
    const paid = await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    expect(paid.status).toBe(200)
    expect(fake._all('journal_entries').filter((e) => e.source === 'job_payment')).toHaveLength(1)

    const voided = await PATCH(req({ payment_id: PAYMENT_ID, status: 'void' }), { params })
    expect(voided.status).toBe(200)

    const reversals = fake._all('journal_entries').filter((e) => e.source === 'job_payment_void' && e.source_id === PAYMENT_ID)
    expect(reversals).toHaveLength(1)
  })

  it('voiding a payment that was never paid posts no reversal (nothing to reverse)', async () => {
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'void' }), { params })
    expect(res.status).toBe(200)
    expect(fake._all('journal_entries')).toHaveLength(0)
  })

  it('re-voiding an already-void payment does not double-reverse', async () => {
    await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    const first = await PATCH(req({ payment_id: PAYMENT_ID, status: 'void' }), { params })
    expect(first.status).toBe(200)

    const second = await PATCH(req({ payment_id: PAYMENT_ID, status: 'void' }), { params })
    expect(second.status).toBe(200)

    const reversals = fake._all('journal_entries').filter((e) => e.source === 'job_payment_void' && e.source_id === PAYMENT_ID)
    expect(reversals).toHaveLength(1)
  })

  it('a reversal RPC failure does not fail the status flip itself', async () => {
    await PATCH(req({ payment_id: PAYMENT_ID, status: 'paid' }), { params })
    rpcFailure.shouldFail = true
    const res = await PATCH(req({ payment_id: PAYMENT_ID, status: 'void' }), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.payment.status).toBe('void')
  })
})
