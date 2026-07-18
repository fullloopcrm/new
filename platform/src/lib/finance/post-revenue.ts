/**
 * Revenue → ledger. Every payment that lands posts a balanced journal entry the
 * moment it's recorded, so the books track income to the penny at the source —
 * not whenever a bank statement happens to get categorized.
 *
 * Accounting model (cash-basis, reconcile-safe):
 *   DR 1050 Undeposited Funds   (full amount received)
 *     CR 4000 Service Revenue   (amount − tip)
 *     CR 4100 Tips              (tip)
 * The later bank-deposit match moves 1050 → 1010 (bank), so revenue is counted
 * once here and the bank categorization only reconciles the asset.
 *
 * Idempotent by (source='payment', source_id=payment.id): safe to call from
 * multiple money-in sites and from the backfill net without double-posting.
 */
import { supabaseAdmin } from '../supabase'
import {
  postJournalEntry,
  ensureChartAccounts,
  getAccountIdByCode,
  journalEntryExists,
  type JournalLineInput,
} from '../ledger'
import { nowNaiveET } from '../recurring'

// Statuses that represent money actually received (full or partial).
const REVENUE_STATUSES = ['completed', 'succeeded', 'partial']

export interface PostRevenueResult {
  posted: boolean
  reason?: string
  entryId?: string
}

/**
 * Post a single payment's revenue to the ledger. Fire-and-forget safe: callers
 * should not block the payment flow on it, but should log failures.
 */
export async function postPaymentRevenue(opts: { tenantId: string; paymentId: string }): Promise<PostRevenueResult> {
  const { tenantId, paymentId } = opts

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, amount_cents, tip_cents, status, method, booking_id')
    .eq('tenant_id', tenantId)
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment) return { posted: false, reason: 'not_found' }

  // Unify the idempotency key with the bookings backfill: a booking-linked
  // payment keys on the BOOKING, so the real-time post and backfillRevenueFromBookings
  // can never double-count the same job. Invoice-only payments key on the payment.
  const source = payment.booking_id ? 'booking' : 'payment'
  const sourceId = (payment.booking_id as string) || paymentId
  if (await journalEntryExists(tenantId, source, sourceId)) {
    return { posted: false, reason: 'already_posted' }
  }
  if (!REVENUE_STATUSES.includes((payment.status as string) || '')) {
    return { posted: false, reason: `status_${payment.status}` }
  }

  const amount = Number(payment.amount_cents) || 0
  if (amount <= 0) return { posted: false, reason: 'zero_amount' }
  const tip = Math.max(0, Number(payment.tip_cents) || 0)
  const serviceRevenue = amount - tip
  if (serviceRevenue < 0) return { posted: false, reason: 'tip_exceeds_amount' }

  await ensureChartAccounts(tenantId)
  const [undeposited, revenueAcct, tipsAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '4000'),
    getAccountIdByCode(tenantId, '4100'),
  ])
  if (!undeposited || !revenueAcct || (tip > 0 && !tipsAcct)) {
    return { posted: false, reason: 'accounts_missing' }
  }

  const lines: JournalLineInput[] = [
    { coa_id: undeposited, debit_cents: amount, memo: 'Payment received' },
  ]
  if (serviceRevenue > 0) lines.push({ coa_id: revenueAcct, credit_cents: serviceRevenue, memo: 'Service revenue' })
  if (tip > 0 && tipsAcct) lines.push({ coa_id: tipsAcct, credit_cents: tip, memo: 'Tip' })

  const bookingRef = payment.booking_id ? ` · booking ${String(payment.booking_id).slice(0, 8)}` : ''
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: nowNaiveET().slice(0, 10),
    memo: `Payment ${payment.method || ''}${bookingRef}`.trim(),
    source,
    source_id: sourceId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Post a single job_payment's revenue to the ledger. job_payments (the Jobs/
 * Projects payment-plan line — deposit/progress/final/milestone, see
 * 2026_07_02_jobs_projects.sql) is a completely separate table from
 * `payments`: it has no method/tip columns and the only thing that ever
 * flips its status to 'paid' is the operator's manual "Mark Paid" click on
 * the Job detail page (PATCH /api/jobs/[id]/payments). Nothing wired that
 * click to the ledger — a paid job-payment milestone posted zero revenue,
 * silently missing from the P&L/trial balance/balance sheet, same
 * manual-payment-revenue-gap class as (152)-(156) but on a rail those fixes
 * never touched. Keyed on source='job_payment' so it can never collide with
 * a booking- or payment-linked entry (separate id space).
 */
export async function postJobPaymentRevenue(opts: { tenantId: string; jobPaymentId: string }): Promise<PostRevenueResult> {
  const { tenantId, jobPaymentId } = opts

  const { data: jobPayment } = await supabaseAdmin
    .from('job_payments')
    .select('id, job_id, amount_cents, status, label, kind')
    .eq('tenant_id', tenantId)
    .eq('id', jobPaymentId)
    .maybeSingle()
  if (!jobPayment) return { posted: false, reason: 'not_found' }
  if (jobPayment.status !== 'paid') return { posted: false, reason: `status_${jobPayment.status}` }

  if (await journalEntryExists(tenantId, 'job_payment', jobPaymentId)) {
    return { posted: false, reason: 'already_posted' }
  }

  const amount = Number(jobPayment.amount_cents) || 0
  if (amount <= 0) return { posted: false, reason: 'zero_amount' }

  await ensureChartAccounts(tenantId)
  const [undeposited, revenueAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '4000'),
  ])
  if (!undeposited || !revenueAcct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: undeposited, debit_cents: amount, memo: 'Job payment received' },
    { coa_id: revenueAcct, credit_cents: amount, memo: 'Service revenue' },
  ]

  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: nowNaiveET().slice(0, 10),
    memo: `Job payment — ${jobPayment.label || jobPayment.kind}`,
    source: 'job_payment',
    source_id: jobPaymentId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Voiding a job_payment that had already posted revenue (postJobPaymentRevenue
 * above) must reverse that entry, or the ledger keeps counting money the
 * payment plan no longer shows as paid — permanently overstating revenue with
 * nothing explaining why. Same class as charge.refunded's ledger-reversal gap
 * in webhooks/stripe/route.ts, on the job_payment rail that fix never
 * touched: PATCH /api/jobs/[id]/payments let 'paid' flip straight to 'void'
 * with no counterpart. Keyed under a different source ('job_payment_void') so
 * it can never collide with, or be mistaken for a duplicate of, the original
 * entry — and only reverses when that original entry actually exists, so
 * voiding a job_payment that was never actually posted (e.g. invoiced →
 * void, never paid) can't create an orphan reversal that understates
 * 1050/4000 with no corresponding sale to cancel out.
 */
export async function reverseJobPaymentRevenue(opts: { tenantId: string; jobPaymentId: string }): Promise<PostRevenueResult> {
  const { tenantId, jobPaymentId } = opts

  if (!(await journalEntryExists(tenantId, 'job_payment', jobPaymentId))) {
    return { posted: false, reason: 'no_original_entry' }
  }
  if (await journalEntryExists(tenantId, 'job_payment_void', jobPaymentId)) {
    return { posted: false, reason: 'already_posted' }
  }

  const { data: jobPayment } = await supabaseAdmin
    .from('job_payments')
    .select('id, amount_cents, label, kind')
    .eq('tenant_id', tenantId)
    .eq('id', jobPaymentId)
    .maybeSingle()
  if (!jobPayment) return { posted: false, reason: 'not_found' }

  const amount = Number(jobPayment.amount_cents) || 0
  if (amount <= 0) return { posted: false, reason: 'zero_amount' }

  await ensureChartAccounts(tenantId)
  const [undeposited, revenueAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '4000'),
  ])
  if (!undeposited || !revenueAcct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: revenueAcct, debit_cents: amount, memo: 'Job payment voided (revenue reversal)' },
    { coa_id: undeposited, credit_cents: amount, memo: 'Job payment voided' },
  ]

  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: nowNaiveET().slice(0, 10),
    memo: `Job payment voided — ${jobPayment.label || jobPayment.kind}`,
    source: 'job_payment_void',
    source_id: jobPaymentId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Backfill the ledger from the REAL paid signal — bookings.payment_status —
 * because the `payments` table is sparse/stale (most paid bookings have no
 * completed payment row). Posts, per paid/partial booking, idempotently:
 *   Revenue  DR 1050 (price+tip)  CR 4000 (price)  CR 4100 (tip)   source='booking'
 *   Labor    DR 5000 (pay)        CR 2450 (pay)                     source='booking_cogs'
 * price/tip/team_member_pay are stored in CENTS. Idempotent by source+booking id.
 */
export async function backfillRevenueFromBookings(
  tenantId: string,
  limit = 10000,
): Promise<{ scanned: number; revenuePosted: number; cogsPosted: number }> {
  await ensureChartAccounts(tenantId)
  const [undeposited, revenueAcct, tipsAcct, contractorAcct, transitAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '4000'),
    getAccountIdByCode(tenantId, '4100'),
    getAccountIdByCode(tenantId, '5000'),
    getAccountIdByCode(tenantId, '2450'),
  ])
  if (!undeposited || !revenueAcct) throw new Error('backfill: revenue accounts missing')

  const PAGE = 1000
  let scanned = 0
  let revenuePosted = 0
  let cogsPosted = 0
  let offset = 0

  for (;;) {
    if (scanned >= limit) break
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('id, price, team_member_pay, tip_amount, payment_date, start_time')
      .eq('tenant_id', tenantId)
      .in('payment_status', ['paid', 'partial'])
      .gt('price', 0)
      .order('start_time', { ascending: true })
      .range(offset, offset + PAGE - 1)
    if (error) throw error
    const rows = data || []

    for (const b of rows) {
      scanned++
      const id = b.id as string
      const price = Math.round(Number(b.price) || 0)
      const tip = Math.max(0, Math.round(Number(b.tip_amount) || 0))
      const date = String((b.payment_date as string) || (b.start_time as string) || new Date().toISOString()).slice(0, 10)

      if (price > 0 && !(await journalEntryExists(tenantId, 'booking', id))) {
        const lines: JournalLineInput[] = [
          { coa_id: undeposited, debit_cents: price + tip, memo: 'Booking revenue' },
          { coa_id: revenueAcct, credit_cents: price, memo: 'Service revenue' },
        ]
        if (tip > 0 && tipsAcct) lines.push({ coa_id: tipsAcct, credit_cents: tip, memo: 'Tip' })
        await postJournalEntry({ tenant_id: tenantId, entry_date: date, memo: `Booking ${id.slice(0, 8)}`, source: 'booking', source_id: id, lines })
        revenuePosted++
      }

      const pay = Math.round(Number(b.team_member_pay) || 0)
      if (pay > 0 && contractorAcct && transitAcct && !(await journalEntryExists(tenantId, 'booking_cogs', id))) {
        await postJournalEntry({
          tenant_id: tenantId,
          entry_date: date,
          memo: `Booking labor ${id.slice(0, 8)}`,
          source: 'booking_cogs',
          source_id: id,
          lines: [
            { coa_id: contractorAcct, debit_cents: pay, memo: 'Contractor pay' },
            { coa_id: transitAcct, credit_cents: pay, memo: 'Payouts in transit' },
          ],
        })
        cogsPosted++
      }
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  return { scanned, revenuePosted, cogsPosted }
}

/**
 * Safety net + retro-post: scan a tenant's recorded payments and post any that
 * lack a journal entry. Catches money-in paths not wired for real-time posting
 * (invoices, mark-paid, imports) and back-fills history. Idempotent.
 */
export async function backfillUnpostedRevenue(tenantId: string, limit = 500): Promise<{ scanned: number; posted: number }> {
  const { data: payments } = await supabaseAdmin
    .from('payments')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', REVENUE_STATUSES)
    .order('created_at', { ascending: true })
    .limit(limit)

  let posted = 0
  for (const p of payments || []) {
    try {
      const r = await postPaymentRevenue({ tenantId, paymentId: p.id as string })
      if (r.posted) posted++
    } catch (e) {
      console.error('[post-revenue] backfill failed for payment', p.id, e)
    }
  }
  return { scanned: (payments || []).length, posted }
}

/**
 * Safety net + retro-post for job_payments (Jobs/Projects), mirroring
 * backfillUnpostedRevenue above for the `payments` table. Separate scan and
 * separate id space (source='job_payment') — can never double-count with the
 * booking/payment-keyed backfills run alongside it in cron/finance-post.
 */
export async function backfillUnpostedJobPaymentRevenue(tenantId: string, limit = 500): Promise<{ scanned: number; posted: number }> {
  const { data: jobPayments } = await supabaseAdmin
    .from('job_payments')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('status', 'paid')
    .order('created_at', { ascending: true })
    .limit(limit)

  let posted = 0
  for (const p of jobPayments || []) {
    try {
      const r = await postJobPaymentRevenue({ tenantId, jobPaymentId: p.id as string })
      if (r.posted) posted++
    } catch (e) {
      console.error('[post-revenue] backfill failed for job_payment', p.id, e)
    }
  }
  return { scanned: (jobPayments || []).length, posted }
}
