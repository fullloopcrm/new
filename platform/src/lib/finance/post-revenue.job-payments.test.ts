/**
 * job_payments (Jobs/Projects payment plan — deposit/progress/final/milestone)
 * is a completely separate table from `payments`: no method/tip columns, and
 * the only thing that ever flips its status to 'paid' is the operator's
 * manual "Mark Paid" click (PATCH /api/jobs/[id]/payments). Nothing posted
 * that money to the ledger — postJobPaymentRevenue + the matching
 * backfillUnpostedJobPaymentRevenue safety net close that gap.
 *
 * Runs the real revenue-posting spine (postJournalEntry + ledger.ts) against
 * the shared in-memory fake, same convention as money-spine.test.ts.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'
import { DEFAULT_CHART } from '../ledger'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h), supabase: makeLedgerSupabaseFake(h) }))

import { postJobPaymentRevenue, reverseJobPaymentRevenue, backfillUnpostedJobPaymentRevenue } from './post-revenue'

const A = 'tenant-A'
const B = 'tenant-B'

function seedChart(tenantId: string) {
  const rows = DEFAULT_CHART.map((a) => ({ id: `coa-${tenantId}-${a.code}`, tenant_id: tenantId, code: a.code, name: a.name, type: a.type }))
  ;(h.store.chart_of_accounts ||= []).push(...rows)
}

function linesByCode(entryId: string, tenantId: string) {
  const codeOf = (coaId: unknown) => (h.store.chart_of_accounts || []).find((c) => c.id === coaId && c.tenant_id === tenantId)?.code as string
  const out: Record<string, { debit: number; credit: number }> = {}
  for (const l of (h.store.journal_entry_lines || []).filter((x) => x.entry_id === entryId)) {
    const code = codeOf(l.coa_id)
    out[code] = { debit: Number(l.debit_cents) || 0, credit: Number(l.credit_cents) || 0 }
  }
  return out
}

beforeEach(() => {
  h.seq = 0
  h.store = { job_payments: [], chart_of_accounts: [], journal_entries: [], journal_entry_lines: [] }
  seedChart(A)
  seedChart(B)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('postJobPaymentRevenue', () => {
  it('posts DR 1050 / CR 4000 for the full amount, keyed source=job_payment', async () => {
    h.store.job_payments.push({ id: 'jp-1', tenant_id: A, job_id: 'job-1', amount_cents: 75_000, status: 'paid', label: 'Deposit', kind: 'deposit' })

    const result = await postJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-1' })
    expect(result.posted).toBe(true)

    const entry = h.store.journal_entries.find((e) => e.id === result.entryId)!
    expect(entry).toMatchObject({ tenant_id: A, source: 'job_payment', source_id: 'jp-1' })

    const byCode = linesByCode(result.entryId!, A)
    expect(byCode['1050']).toEqual({ debit: 75_000, credit: 0 })
    expect(byCode['4000']).toEqual({ debit: 0, credit: 75_000 })
  })

  it('does not post for a job_payment that is not yet paid', async () => {
    h.store.job_payments.push({ id: 'jp-2', tenant_id: A, job_id: 'job-1', amount_cents: 30_000, status: 'invoiced', label: 'Progress', kind: 'progress' })
    const result = await postJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-2' })
    expect(result).toMatchObject({ posted: false, reason: 'status_invoiced' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('is idempotent: re-posting the same job_payment does not create a second entry', async () => {
    h.store.job_payments.push({ id: 'jp-3', tenant_id: A, job_id: 'job-1', amount_cents: 10_000, status: 'paid', label: 'Final', kind: 'final' })
    const first = await postJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-3' })
    expect(first.posted).toBe(true)
    const second = await postJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-3' })
    expect(second).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source_id === 'jp-3')).toHaveLength(1)
  })

  it("two tenants' entries never cross", async () => {
    h.store.job_payments.push(
      { id: 'jp-A', tenant_id: A, job_id: 'job-A', amount_cents: 20_000, status: 'paid', label: 'Deposit', kind: 'deposit' },
      { id: 'jp-B', tenant_id: B, job_id: 'job-B', amount_cents: 8_000, status: 'paid', label: 'Deposit', kind: 'deposit' },
    )
    const legA = await postJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-A' })
    const legB = await postJobPaymentRevenue({ tenantId: B, jobPaymentId: 'jp-B' })

    expect(h.store.journal_entries.filter((e) => e.tenant_id === A)).toHaveLength(1)
    expect(h.store.journal_entries.filter((e) => e.tenant_id === B)).toHaveLength(1)
    expect(linesByCode(legA.entryId!, A)['1050'].debit).toBe(20_000)
    expect(linesByCode(legB.entryId!, B)['1050'].debit).toBe(8_000)
  })
})

/** Seed a job_payment as 'paid', post its real revenue entry (via the actual
 * spine), then flip the row to 'void' -- mirroring what the PATCH route does:
 * post while paid, then later (a separate request) void it. */
async function seedPaidThenVoid(id: string, amountCents: number, tenantId = A) {
  h.store.job_payments.push({ id, tenant_id: tenantId, job_id: 'job-1', amount_cents: amountCents, status: 'paid', label: 'Deposit', kind: 'deposit' })
  const posted = await postJobPaymentRevenue({ tenantId, jobPaymentId: id })
  const row = h.store.job_payments.find((p) => p.id === id)!
  row.status = 'void'
  return posted
}

describe('reverseJobPaymentRevenue', () => {
  it('posts DR 4000 / CR 1050 for the full amount, keyed source=job_payment_void', async () => {
    const original = await seedPaidThenVoid('jp-void-1', 50_000)
    expect(original.posted).toBe(true)

    const result = await reverseJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-void-1' })
    expect(result.posted).toBe(true)

    const entry = h.store.journal_entries.find((e) => e.id === result.entryId)!
    expect(entry).toMatchObject({ tenant_id: A, source: 'job_payment_void', source_id: 'jp-void-1' })

    const byCode = linesByCode(result.entryId!, A)
    expect(byCode['4000']).toEqual({ debit: 50_000, credit: 0 })
    expect(byCode['1050']).toEqual({ debit: 0, credit: 50_000 })
  })

  it('does nothing when the job_payment was never actually posted (no original entry)', async () => {
    h.store.job_payments.push({ id: 'jp-void-2', tenant_id: A, job_id: 'job-1', amount_cents: 20_000, status: 'void', label: 'Progress', kind: 'progress' })
    const result = await reverseJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-void-2' })
    expect(result).toMatchObject({ posted: false, reason: 'no_original_entry' })
    expect(h.store.journal_entries).toHaveLength(0)
  })

  it('is idempotent: reversing twice does not create a second reversal entry', async () => {
    await seedPaidThenVoid('jp-void-3', 30_000)

    const first = await reverseJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-void-3' })
    expect(first.posted).toBe(true)
    const second = await reverseJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-void-3' })
    expect(second).toMatchObject({ posted: false, reason: 'already_posted' })
    expect(h.store.journal_entries.filter((e) => e.source === 'job_payment_void' && e.source_id === 'jp-void-3')).toHaveLength(1)
  })
})

describe('backfillUnpostedJobPaymentRevenue', () => {
  it('posts every paid job_payment lacking a journal entry, skips non-paid ones', async () => {
    h.store.job_payments.push(
      { id: 'jp-10', tenant_id: A, job_id: 'job-1', amount_cents: 15_000, status: 'paid', label: 'Deposit', kind: 'deposit', created_at: '2026-01-01' },
      { id: 'jp-11', tenant_id: A, job_id: 'job-1', amount_cents: 25_000, status: 'paid', label: 'Final', kind: 'final', created_at: '2026-01-02' },
      { id: 'jp-12', tenant_id: A, job_id: 'job-1', amount_cents: 5_000, status: 'invoiced', label: 'Progress', kind: 'progress', created_at: '2026-01-03' },
    )
    const result = await backfillUnpostedJobPaymentRevenue(A)
    expect(result).toEqual({ scanned: 2, posted: 2 })
    expect(h.store.journal_entries.filter((e) => e.source === 'job_payment')).toHaveLength(2)
  })

  it('does not re-post a job_payment that already has a journal entry', async () => {
    h.store.job_payments.push({ id: 'jp-20', tenant_id: A, job_id: 'job-1', amount_cents: 40_000, status: 'paid', label: 'Deposit', kind: 'deposit', created_at: '2026-01-01' })
    await postJobPaymentRevenue({ tenantId: A, jobPaymentId: 'jp-20' })

    const result = await backfillUnpostedJobPaymentRevenue(A)
    expect(result).toEqual({ scanned: 1, posted: 0 })
    expect(h.store.journal_entries.filter((e) => e.source_id === 'jp-20')).toHaveLength(1)
  })
})
