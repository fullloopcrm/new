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

  // Idempotency first — cheap, and the common case on webhook retries.
  if (await journalEntryExists(tenantId, 'payment', paymentId)) {
    return { posted: false, reason: 'already_posted' }
  }

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('id, amount_cents, tip_cents, status, method, booking_id')
    .eq('tenant_id', tenantId)
    .eq('id', paymentId)
    .maybeSingle()
  if (!payment) return { posted: false, reason: 'not_found' }
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
    source: 'payment',
    source_id: paymentId,
    lines,
  })
  return { posted: true, entryId }
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
