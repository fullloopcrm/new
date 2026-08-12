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
  isUniqueViolation,
  type JournalLineInput,
} from '../ledger'
import { laborAccountId } from './post-labor'

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

  // Same guard as backfillRevenueFromBookings below -- a payment can
  // reference a booking that was cancelled after the payment succeeded
  // (refund not yet reconciled). Never recognize revenue for a job that
  // didn't happen, regardless of the payment record's own status.
  if (payment.booking_id) {
    const { data: bkg } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', payment.booking_id as string)
      .maybeSingle()
    if (bkg?.status === 'cancelled') return { posted: false, reason: 'booking_cancelled' }
  }

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
    entry_date: new Date().toISOString().slice(0, 10),
    memo: `Payment ${payment.method || ''}${bookingRef}`.trim(),
    source,
    source_id: sourceId,
    lines,
  })
  // NULL means a concurrent caller already claimed this (source, source_id)
  // between our journalEntryExists() check above and this insert.
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Post a Shop order's revenue to the ledger — DR 1050 Undeposited Funds,
 * CR 4010 Product Sales (the dedicated e-commerce account in DEFAULT_CHART,
 * kept separate from 4000 Service Revenue so P&L reporting can tell product
 * sales apart from service jobs). Idempotent by (source='shop_order',
 * source_id=order.id), called from the Stripe webhook's handleShopOrder
 * right after the order row itself is created.
 */
export async function postShopOrderRevenue(opts: { tenantId: string; orderId: string; subtotalCents: number }): Promise<PostRevenueResult> {
  const { tenantId, orderId, subtotalCents } = opts
  if (subtotalCents <= 0) return { posted: false, reason: 'zero_amount' }

  if (await journalEntryExists(tenantId, 'shop_order', orderId)) {
    return { posted: false, reason: 'already_posted' }
  }

  await ensureChartAccounts(tenantId)
  const [undeposited, productRevenueAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '4010'),
  ])
  if (!undeposited || !productRevenueAcct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: undeposited, debit_cents: subtotalCents, memo: 'Shop order received' },
    { coa_id: productRevenueAcct, credit_cents: subtotalCents, memo: 'Product sales' },
  ]

  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: `Shop order ${orderId.slice(0, 8)}`,
    source: 'shop_order',
    source_id: orderId,
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
 *   Labor    DR 5000/5010 (pay)   CR 2450 (pay)                     source='booking_cogs'
 * price/tip/team_member_pay are stored in CENTS. Idempotent by source+booking id.
 *
 * Labor is CONDITIONAL: only accrued via 'booking_cogs' when no real,
 * ledger-postable payout record exists for that booking yet — this is
 * because a real payout (Stripe Connect `team_member_payouts`, keyed by
 * booking_id) or a completed payroll run (which flips a booking's own
 * `status` to 'paid') already posts labor cost correctly via post-labor.ts,
 * employment-type-aware. Double-posting the same job's labor was a real bug
 * here (see booking-labor-single-post.test.ts) for tenants that DO use those
 * paths.
 *
 * But for a tenant with NO ledger-postable payout signal at all — confirmed
 * live on NYC Maid: `team_member_payouts` and `payroll_payments` both had
 * ZERO rows across 6 months and 629 completed/paid jobs, because cleaners are
 * actually paid manually off-platform (Zelle/Venmo/cash/Apple Pay) and only
 * marked via the `team_member_paid` checkbox, which posts nothing — removing
 * this accrual entirely would have zeroed out 100% of that tenant's real
 * labor expense going forward. `booking_cogs` is the fallback that keeps
 * their books honest until/unless they wire a real payout mechanism.
 *
 * Note: `team_member_paid` is NOT used as the skip signal — it fires for
 * that same off-ledger manual-checkout path, so treating it as "already
 * posted" would reproduce the exact zeroed-books problem this exists to
 * avoid. The skip check only looks at signals that correspond to an actual
 * ledger post: a `team_member_payouts` row for this booking, or this
 * booking's own `status` already flipped to 'paid' (which only the Payroll
 * POST route does, and only after it calls postPayrollToLedger).
 *
 * Known residual gap: payroll_payments has no per-booking link, and a
 * PARTIAL payroll payment doesn't flip booking.status to 'paid' — so a
 * booking whose labor was partially paid out via the Payroll tab, without
 * yet covering the full amount owed, isn't detected here and could still
 * double-post if 'booking_cogs' already fired first. Flagged, not fixed —
 * the schema has no booking-level payroll_payments linkage to check against.
 */
export async function backfillRevenueFromBookings(
  tenantId: string,
  limit = 10000,
): Promise<{ scanned: number; revenuePosted: number; cogsPosted: number }> {
  await ensureChartAccounts(tenantId)
  const [undeposited, revenueAcct, tipsAcct, transitAcct] = await Promise.all([
    getAccountIdByCode(tenantId, '1050'),
    getAccountIdByCode(tenantId, '4000'),
    getAccountIdByCode(tenantId, '4100'),
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
      .select('id, price, team_member_id, team_member_pay, tip_amount, payment_date, start_time, status')
      .eq('tenant_id', tenantId)
      .in('payment_status', ['paid', 'partial'])
      // A booking can carry a stale 'paid'/'partial' payment_status from
      // before it was cancelled (refund never reconciled, or payment_status
      // just never got reset on cancel) -- this filter was missing entirely,
      // so a cancelled booking that happened to still read 'paid' got its
      // revenue posted to the ledger as if the job actually happened. Found
      // live on nycmaid: 19 entries, $5,501 recognized for jobs that never
      // ran, including two 2027-dated cancelled bookings.
      .neq('status', 'cancelled')
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

      // journalEntryExists() is a fast-path; the INSERT inside postJournalEntry
      // is the atomic guard — a concurrent post (e.g. this backfill overlapping
      // a real-time postPaymentRevenue call for the same booking) 23505s and
      // is treated as already-posted rather than double-counting revenue.
      if (price > 0 && !(await journalEntryExists(tenantId, 'booking', id))) {
        const lines: JournalLineInput[] = [
          { coa_id: undeposited, debit_cents: price + tip, memo: 'Booking revenue' },
          { coa_id: revenueAcct, credit_cents: price, memo: 'Service revenue' },
        ]
        if (tip > 0 && tipsAcct) lines.push({ coa_id: tipsAcct, credit_cents: tip, memo: 'Tip' })
        try {
          await postJournalEntry({ tenant_id: tenantId, entry_date: date, memo: `Booking ${id.slice(0, 8)}`, source: 'booking', source_id: id, lines })
          revenuePosted++
        } catch (e) {
          if (!isUniqueViolation(e)) throw e
        }
      }

      const pay = Math.round(Number(b.team_member_pay) || 0)
      if (pay > 0 && transitAcct && !(await journalEntryExists(tenantId, 'booking_cogs', id))) {
        const alreadyHasRealPayout = await bookingHasRealPayoutRecord(tenantId, id, b.status as string)
        if (!alreadyHasRealPayout) {
          const laborAcct = await laborAccountId(tenantId, (b.team_member_id as string) || null)
          if (laborAcct) {
            try {
              await postJournalEntry({
                tenant_id: tenantId,
                entry_date: date,
                memo: `Booking labor ${id.slice(0, 8)}`,
                source: 'booking_cogs',
                source_id: id,
                lines: [
                  { coa_id: laborAcct, debit_cents: pay, memo: 'Labor cost' },
                  { coa_id: transitAcct, credit_cents: pay, memo: 'Payouts in transit' },
                ],
              })
              cogsPosted++
            } catch (e) {
              if (!isUniqueViolation(e)) throw e
            }
          }
        }
      }
    }

    if (rows.length < PAGE) break
    offset += PAGE
  }

  return { scanned, revenuePosted, cogsPosted }
}

/**
 * Does this booking already have a REAL, ledger-postable payout record —
 * as opposed to just the manual `team_member_paid` checkbox, which posts
 * nothing? See backfillRevenueFromBookings's docstring for why that
 * distinction matters.
 */
async function bookingHasRealPayoutRecord(tenantId: string, bookingId: string, bookingStatus: string): Promise<boolean> {
  // The Payroll POST route only flips a booking's own status to 'paid' after
  // postPayrollToLedger has posted that payment — see src/app/api/finance/payroll/route.ts.
  if (bookingStatus === 'paid') return true

  // team_member_payouts carries a direct booking_id link (see cleaner-payout.ts's
  // cleanerAlreadyPaid, the same check used before a Stripe Connect transfer).
  const { data } = await supabaseAdmin
    .from('team_member_payouts')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
    .limit(1)
    .maybeSingle()
  return !!data
}

/**
 * Reverses ONE booking's already-posted revenue, if it has any and hasn't
 * already been reversed. Wired into the booking cancel transition (POST
 * /api/bookings/[id]/status) so a job whose revenue was posted — then
 * cancelled with no Stripe refund attached (e.g. a cash job cancelled after
 * the fact) — gets its books corrected automatically, instead of relying on
 * reverseCancelledBookingRevenue() below being run by hand (as it was,
 * exactly once, on 2026-07-27).
 *
 * Skips (does nothing, reason explains why) when:
 *   - the booking's payment was already refunded through Stripe. The
 *     charge.refunded webhook's postRefundToLedger already reversed the
 *     revenue via a DIFFERENT source key ('refund', keyed to the Stripe
 *     refund id, not the booking id) and stamps bookings.payment_status =
 *     'refunded' the same way the existing manual Selena refund tool
 *     (handleProcessStripeRefund) already does — reversing here too would
 *     double-count the correction. Known gap: a booking merely
 *     'refund_pending' (approved but not yet processed in Stripe, see
 *     handleApproveRefund) isn't caught by this check — if it's cancelled
 *     before the refund actually posts in Stripe and this function has
 *     already reversed it, a refund landing afterward would double-reverse.
 *     There's no reliable "a refund is definitely coming" signal today short
 *     of it having already landed; flagged, not fixed.
 *   - the booking never had revenue posted (no 'booking'-source entry)
 *   - it was already reversed (idempotent, same guard reverseCancelledBookingRevenue used)
 */
export async function reverseBookingRevenueIfPosted(
  tenantId: string,
  bookingId: string,
): Promise<{ reversed: boolean; reason?: string; reversedCents?: number }> {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('payment_status')
    .eq('id', bookingId)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (booking?.payment_status === 'refunded') {
    return { reversed: false, reason: 'refund_path_handled' }
  }

  const { data: entry } = await supabaseAdmin
    .from('journal_entries')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source', 'booking')
    .eq('source_id', bookingId)
    .maybeSingle()
  if (!entry) return { reversed: false, reason: 'no_revenue_posted' }

  if (await journalEntryExists(tenantId, 'booking_reversal', bookingId)) {
    return { reversed: false, reason: 'already_reversed' }
  }

  const { data: lines } = await supabaseAdmin
    .from('journal_lines')
    .select('coa_id, debit_cents, credit_cents')
    .eq('tenant_id', tenantId)
    .eq('entry_id', entry.id as string)
  if (!lines || lines.length === 0) return { reversed: false, reason: 'no_lines' }

  const reversedLines: JournalLineInput[] = lines.map((l) => ({
    coa_id: l.coa_id as string,
    debit_cents: l.credit_cents || 0,
    credit_cents: l.debit_cents || 0,
    memo: 'Reversal: booking cancelled after revenue was posted',
  }))
  const cents = lines.reduce((s, l) => s + (l.credit_cents || 0), 0)

  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: `Reversal — booking ${bookingId.slice(0, 8)} cancelled`,
    source: 'booking_reversal',
    source_id: bookingId,
    lines: reversedLines,
  })
  if (!entryId) return { reversed: false, reason: 'already_reversed' }
  return { reversed: true, reversedCents: cents }
}

/**
 * Corrective reversal for revenue already wrongly posted for bookings that
 * were cancelled (the gap backfillRevenueFromBookings/postPaymentRevenue now
 * guard against going forward). Journal entries are append-only -- this never
 * edits or deletes the original wrong entry, it posts an equal-and-opposite
 * reversing entry (swap debit/credit on every line) under a distinct
 * source='booking_reversal' so the mistake and its correction are both
 * visible in the audit trail, and it's idempotent (unique on
 * tenant_id+source+source_id, same as every other posting path).
 *
 * Tenant-wide safety-net scan — shares its per-booking logic with
 * reverseBookingRevenueIfPosted above (which is now the real-time path, run
 * automatically on cancel) so both agree on when a reversal is safe.
 */
export async function reverseCancelledBookingRevenue(
  tenantId: string,
): Promise<{ scanned: number; reversed: number; reversedCents: number }> {
  const { data: entries } = await supabaseAdmin
    .from('journal_entries')
    .select('id, source_id')
    .eq('tenant_id', tenantId)
    .eq('source', 'booking')
  let scanned = 0
  let reversed = 0
  let reversedCents = 0

  for (const entry of entries || []) {
    if (!entry.source_id) continue
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('status')
      .eq('id', entry.source_id as string)
      .maybeSingle()
    if (booking?.status !== 'cancelled') continue
    scanned++

    const result = await reverseBookingRevenueIfPosted(tenantId, entry.source_id as string)
    if (result.reversed) {
      reversed++
      reversedCents += result.reversedCents || 0
    }
  }
  return { scanned, reversed, reversedCents }
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
