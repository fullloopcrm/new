/**
 * Money-event adjustments → ledger: deposits, refunds, chargebacks.
 * Same spine + idempotency model as post-revenue / post-labor.
 *
 *  Deposit    DR 1050 Undeposited      CR 2350 Customer Deposits (liability)
 *  Refund     DR 4000 Service Revenue  CR 1050 Undeposited        (reverse sale)
 *  Chargeback DR 6110 Chargebacks      CR 1050 Undeposited        (loss)
 *
 * A deposit is a liability until the job runs, not revenue — reclassifying it to
 * 4000 on job completion is a follow-up (needs the deposit→final-invoice link).
 */
import { supabaseAdmin } from '../supabase'
import {
  postJournalEntry,
  ensureChartAccounts,
  getAccountIdByCode,
  journalEntryExists,
  type JournalLineInput,
} from '../ledger'

export interface PostAdjResult {
  posted: boolean
  reason?: string
  entryId?: string
}

/** Look up a booking's entity_id; returns null if unset or the booking is gone. */
async function resolveEntityIdFromBooking(bookingId: string | null): Promise<string | null> {
  if (!bookingId) return null
  const { data } = await supabaseAdmin
    .from('bookings')
    .select('entity_id')
    .eq('id', bookingId)
    .maybeSingle()
  return (data?.entity_id as string) || null
}

async function resolveAccounts(tenantId: string, codes: string[]): Promise<Record<string, string> | null> {
  await ensureChartAccounts(tenantId)
  const ids = await Promise.all(codes.map((c) => getAccountIdByCode(tenantId, c)))
  const out: Record<string, string> = {}
  for (let i = 0; i < codes.length; i++) {
    if (!ids[i]) return null
    out[codes[i]] = ids[i] as string
  }
  return out
}

/** Customer deposit received (e.g. quote deposit) → liability, not revenue. */
export async function postDepositToLedger(opts: {
  tenantId: string
  sourceId: string          // quote id (or deposit reference)
  amountCents: number
  memo?: string
}): Promise<PostAdjResult> {
  const { tenantId, sourceId, amountCents } = opts
  if (await journalEntryExists(tenantId, 'deposit', sourceId)) return { posted: false, reason: 'already_posted' }
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  const acct = await resolveAccounts(tenantId, ['1050', '2350'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: acct['1050'], debit_cents: amountCents, memo: 'Deposit received' },
    { coa_id: acct['2350'], credit_cents: amountCents, memo: 'Customer deposit (unearned)' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: opts.memo || 'Customer deposit',
    source: 'deposit',
    source_id: sourceId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/** Refund issued → reverse the sale. `sourceId` = Stripe refund id (unique). */
export async function postRefundToLedger(opts: {
  tenantId: string
  sourceId: string
  amountCents: number
  memo?: string
  entityId?: string | null
}): Promise<PostAdjResult> {
  const { tenantId, sourceId, amountCents } = opts
  if (await journalEntryExists(tenantId, 'refund', sourceId)) return { posted: false, reason: 'already_posted' }
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  const acct = await resolveAccounts(tenantId, ['4000', '1050'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: acct['4000'], debit_cents: amountCents, memo: 'Refund (revenue reversal)' },
    { coa_id: acct['1050'], credit_cents: amountCents, memo: 'Refund paid out' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entity_id: opts.entityId ?? null,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: opts.memo || 'Refund',
    source: 'refund',
    source_id: sourceId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/** Chargeback / dispute funds withdrawn → record the loss. `sourceId` = dispute id. */
export async function postChargebackToLedger(opts: {
  tenantId: string
  sourceId: string
  amountCents: number
  memo?: string
  entityId?: string | null
}): Promise<PostAdjResult> {
  const { tenantId, sourceId, amountCents } = opts
  if (await journalEntryExists(tenantId, 'chargeback', sourceId)) return { posted: false, reason: 'already_posted' }
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  const acct = await resolveAccounts(tenantId, ['6110', '1050'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: acct['6110'], debit_cents: amountCents, memo: 'Chargeback' },
    { coa_id: acct['1050'], credit_cents: amountCents, memo: 'Chargeback funds withdrawn' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entity_id: opts.entityId ?? null,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: opts.memo || 'Chargeback',
    source: 'chargeback',
    source_id: sourceId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Referral commission earned → accrue as an expense + a payable (accrual basis):
 *   DR 6045 Referral Commissions   CR 2400 Commissions Payable
 * Idempotent by (source='commission', source_id=commission.id).
 */
export async function postCommissionAccrual(opts: { tenantId: string; commissionId: string }): Promise<PostAdjResult> {
  const { tenantId, commissionId } = opts
  if (await journalEntryExists(tenantId, 'commission', commissionId)) return { posted: false, reason: 'already_posted' }
  const { data: c } = await supabaseAdmin
    .from('referral_commissions')
    .select('commission_cents, status, booking_id')
    .eq('tenant_id', tenantId)
    .eq('id', commissionId)
    .maybeSingle()
  if (!c) return { posted: false, reason: 'not_found' }
  if (c.status === 'void') return { posted: false, reason: 'void' }
  const amt = Number(c.commission_cents) || 0
  if (amt <= 0) return { posted: false, reason: 'zero_amount' }

  const acct = await resolveAccounts(tenantId, ['6045', '2400'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }
  const entityId = await resolveEntityIdFromBooking(c.booking_id as string | null)
  const lines: JournalLineInput[] = [
    { coa_id: acct['6045'], debit_cents: amt, memo: 'Referral commission earned' },
    { coa_id: acct['2400'], credit_cents: amt, memo: 'Commission payable' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entity_id: entityId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: 'Referral commission',
    source: 'commission',
    source_id: commissionId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Referral commission paid out → clear the payable against cash:
 *   DR 2400 Commissions Payable   CR 1010 Operating Checking
 * Ensures the accrual exists first so the payable never goes negative.
 */
export async function postCommissionPayment(opts: { tenantId: string; commissionId: string }): Promise<PostAdjResult> {
  const { tenantId, commissionId } = opts
  if (await journalEntryExists(tenantId, 'commission_paid', commissionId)) return { posted: false, reason: 'already_posted' }
  const { data: c } = await supabaseAdmin
    .from('referral_commissions')
    .select('commission_cents, booking_id')
    .eq('tenant_id', tenantId)
    .eq('id', commissionId)
    .maybeSingle()
  if (!c) return { posted: false, reason: 'not_found' }
  const amt = Number(c.commission_cents) || 0
  if (amt <= 0) return { posted: false, reason: 'zero_amount' }

  await postCommissionAccrual({ tenantId, commissionId }).catch(() => {})
  const acct = await resolveAccounts(tenantId, ['2400', '1010'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }
  const entityId = await resolveEntityIdFromBooking(c.booking_id as string | null)
  const lines: JournalLineInput[] = [
    { coa_id: acct['2400'], debit_cents: amt, memo: 'Commission paid' },
    { coa_id: acct['1010'], credit_cents: amt, memo: 'Commission payout' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entity_id: entityId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: 'Referral commission paid',
    source: 'commission_paid',
    source_id: commissionId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Sales partner commission earned (direct client or referrer-recruit
 * override) → accrue the same expense/payable pair a referral commission
 * uses. Distinct source key ('sales_partner_commission') so it never
 * collides with a referral_commissions accrual on the same booking — the
 * two are meant to stack. Idempotent by (source, source_id=commission.id).
 */
export async function postSalesPartnerCommissionAccrual(opts: { tenantId: string; commissionId: string }): Promise<PostAdjResult> {
  const { tenantId, commissionId } = opts
  if (await journalEntryExists(tenantId, 'sales_partner_commission', commissionId)) return { posted: false, reason: 'already_posted' }
  const { data: c } = await supabaseAdmin
    .from('sales_partner_commissions')
    .select('commission_cents, status')
    .eq('tenant_id', tenantId)
    .eq('id', commissionId)
    .maybeSingle()
  if (!c) return { posted: false, reason: 'not_found' }
  if (c.status === 'void') return { posted: false, reason: 'void' }
  const amt = Number(c.commission_cents) || 0
  if (amt <= 0) return { posted: false, reason: 'zero_amount' }

  const acct = await resolveAccounts(tenantId, ['6045', '2400'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }
  const lines: JournalLineInput[] = [
    { coa_id: acct['6045'], debit_cents: amt, memo: 'Sales partner commission earned' },
    { coa_id: acct['2400'], credit_cents: amt, memo: 'Commission payable' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: 'Sales partner commission',
    source: 'sales_partner_commission',
    source_id: commissionId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/** Sales partner commission paid out → clear the payable against cash. */
export async function postSalesPartnerCommissionPayment(opts: { tenantId: string; commissionId: string }): Promise<PostAdjResult> {
  const { tenantId, commissionId } = opts
  if (await journalEntryExists(tenantId, 'sales_partner_commission_paid', commissionId)) return { posted: false, reason: 'already_posted' }
  const { data: c } = await supabaseAdmin
    .from('sales_partner_commissions')
    .select('commission_cents')
    .eq('tenant_id', tenantId)
    .eq('id', commissionId)
    .maybeSingle()
  if (!c) return { posted: false, reason: 'not_found' }
  const amt = Number(c.commission_cents) || 0
  if (amt <= 0) return { posted: false, reason: 'zero_amount' }

  await postSalesPartnerCommissionAccrual({ tenantId, commissionId }).catch(() => {})
  const acct = await resolveAccounts(tenantId, ['2400', '1010'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }
  const lines: JournalLineInput[] = [
    { coa_id: acct['2400'], debit_cents: amt, memo: 'Commission paid' },
    { coa_id: acct['1010'], credit_cents: amt, memo: 'Commission payout' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo: 'Sales partner commission paid',
    source: 'sales_partner_commission_paid',
    source_id: commissionId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/** Safety net: accrue every commission + post payments for paid ones. Idempotent. */
export async function backfillUnpostedCommissions(tenantId: string, limit = 500): Promise<{ accrued: number; paid: number }> {
  let accrued = 0
  let paid = 0
  const { data: rows } = await supabaseAdmin
    .from('referral_commissions')
    .select('id, status')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(limit)
  for (const r of rows || []) {
    try {
      if (r.status !== 'void') {
        const a = await postCommissionAccrual({ tenantId, commissionId: r.id as string })
        if (a.posted) accrued++
      }
      if (r.status === 'paid') {
        const p = await postCommissionPayment({ tenantId, commissionId: r.id as string })
        if (p.posted) paid++
      }
    } catch (e) {
      console.error('[post-adjustments] commission backfill failed', r.id, e)
    }
  }
  return { accrued, paid }
}

/**
 * Sync `bookings.payment_status` after a Stripe refund FULLY reverses a
 * charge. Selena's own manual refund tool (`handleProcessStripeRefund`)
 * already sets this the instant it initiates a refund, but any refund
 * processed the normal way -- directly in the Stripe Dashboard, or by any
 * integration outside Selena chat -- only ever hit `postRefundToLedger`
 * above and never touched the booking row. The ledger was correct; the
 * booking kept reading 'paid'/'partial' forever, so every booking-driven
 * finance report (dashboard, P&L, cash-flow, AR-aging) kept counting its
 * full price as still-collected revenue with no way to ever correct it.
 * Partial refunds are left alone -- there's no agreed status/partial_
 * payment_cents treatment for a partially-refunded booking yet, flagged as
 * an open question rather than guessed at.
 */
export async function syncBookingRefundStatus(opts: { tenantId: string; bookingId: string }): Promise<void> {
  await supabaseAdmin
    .from('bookings')
    .update({ payment_status: 'refunded' })
    .eq('tenant_id', opts.tenantId)
    .eq('id', opts.bookingId)
}

/**
 * Resolve a tenant id (and payment memo) from a Stripe payment_intent, used by
 * refund/dispute webhook handlers where only the charge/intent is known.
 */
export async function tenantFromPaymentIntent(paymentIntentId: string): Promise<{ tenantId: string; bookingId: string | null; entityId: string | null } | null> {
  if (!paymentIntentId) return null
  const { data } = await supabaseAdmin
    .from('payments')
    .select('tenant_id, booking_id, invoice_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .limit(1)
    .maybeSingle()
  if (!data?.tenant_id) return null
  const bookingId = (data.booking_id as string) || null
  let entityId = await resolveEntityIdFromBooking(bookingId)
  if (!entityId && data.invoice_id) {
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('entity_id')
      .eq('id', data.invoice_id as string)
      .maybeSingle()
    entityId = (invoice?.entity_id as string) || null
  }
  return { tenantId: data.tenant_id as string, bookingId, entityId }
}
