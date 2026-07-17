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
    .select('id, amount_cents, tip_cents, status, method, booking_id, invoice_id')
    .eq('tenant_id', tenantId)
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment) return { posted: false, reason: 'not_found' }

  // Unify the idempotency key with the bookings backfill: the FIRST
  // booking-linked payment keys on the BOOKING, so the real-time post and
  // backfillRevenueFromBookings can never double-count the same job's first
  // dollar. Invoice-only payments key on the payment.
  //
  // A SECOND+ payment on the same booking (multi-installment partial
  // payments, or mark-paid closing out the remaining balance in cash) can't
  // reuse that same booking-keyed slot -- it's already claimed -- so it
  // silently posted NOTHING to the ledger. Falls through to a 'booking_topup'
  // entry keyed on this specific payment instead, so every dollar actually
  // received lands in the books, not just the first installment.
  const bookingId = payment.booking_id as string | null
  let source = bookingId ? 'booking' : 'payment'
  let sourceId = bookingId || paymentId
  if (bookingId && (await journalEntryExists(tenantId, 'booking', bookingId))) {
    source = 'booking_topup'
    sourceId = paymentId
  }
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

  // Resolve which entity this payment's revenue belongs to. bookings.entity_id
  // and invoices.entity_id are both populated (034/039); payments.entity_id
  // itself is not currently set anywhere, so derive from whichever the
  // payment is linked to rather than trusting the column on this row.
  let entityId: string | null = null
  if (bookingId) {
    const { data: booking } = await supabaseAdmin
      .from('bookings')
      .select('entity_id')
      .eq('id', bookingId)
      .maybeSingle()
    entityId = (booking?.entity_id as string) || null
  } else if (payment.invoice_id) {
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('entity_id')
      .eq('id', payment.invoice_id as string)
      .maybeSingle()
    entityId = (invoice?.entity_id as string) || null
  }

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
    entity_id: entityId,
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
      .select('id, price, team_member_pay, tip_amount, payment_status, partial_payment_cents, payment_date, start_time, entity_id')
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
      const entityId = (b.entity_id as string) || null

      // A 'partial' booking has only collected partial_payment_cents from
      // the client -- the same signal ar-aging/cash-flow/summary/tax-export/
      // dashboard already key off. Posting the full price+tip here put money
      // that was never actually received into Undeposited Funds and Service
      // Revenue, permanently overstating both in the ledger. Tip isn't
      // split out for a partial payment since which portion (if any) of a
      // partial amount is tip vs. service is unknown.
      const isPartial = b.payment_status === 'partial'
      const receivedCents = isPartial
        ? Math.max(0, Math.round(Number(b.partial_payment_cents) || 0))
        : price + tip
      const revenueCents = isPartial ? receivedCents : price

      if (revenueCents > 0 && !(await journalEntryExists(tenantId, 'booking', id))) {
        const lines: JournalLineInput[] = [
          { coa_id: undeposited, debit_cents: receivedCents, memo: 'Booking revenue' },
          { coa_id: revenueAcct, credit_cents: revenueCents, memo: 'Service revenue' },
        ]
        if (!isPartial && tip > 0 && tipsAcct) lines.push({ coa_id: tipsAcct, credit_cents: tip, memo: 'Tip' })
        await postJournalEntry({ tenant_id: tenantId, entity_id: entityId, entry_date: date, memo: `Booking ${id.slice(0, 8)}`, source: 'booking', source_id: id, lines })
        revenuePosted++
      }

      const pay = Math.round(Number(b.team_member_pay) || 0)
      if (pay > 0 && contractorAcct && transitAcct && !(await journalEntryExists(tenantId, 'booking_cogs', id))) {
        await postJournalEntry({
          tenant_id: tenantId,
          entity_id: entityId,
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
