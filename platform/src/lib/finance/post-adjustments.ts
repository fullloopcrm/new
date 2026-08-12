/**
 * Money-event adjustments → ledger: deposits, refunds, chargebacks.
 * Same spine + idempotency model as post-revenue / post-labor.
 *
 *  Deposit    DR 1050 Undeposited                     CR 2350 Customer Deposits (liability)
 *  Refund     DR 4000 Service Revenue (+ 4100 Tips)    CR 1050 Undeposited        (reverse sale)
 *  Chargeback DR 6110 Chargebacks                      CR 1050 Undeposited        (loss)
 *
 * A deposit is a liability until the job runs, not revenue — reclassifying it to
 * 4000 on job completion is a follow-up (needs the deposit→final-invoice link).
 */
import { supabaseAdmin } from '../supabase'
import { getTenantTimezone, toTenantNaiveString } from '../tenant-time'

async function tenantEntryDate(tenantId: string): Promise<string> {
  const { data: tenantRow } = await supabaseAdmin.from('tenants').select('timezone').eq('id', tenantId).maybeSingle()
  return toTenantNaiveString(getTenantTimezone(tenantRow)).slice(0, 10)
}
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
    entry_date: await tenantEntryDate(tenantId),
    memo: opts.memo || 'Customer deposit',
    source: 'deposit',
    source_id: sourceId,
    lines,
  })
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/**
 * Refund issued → reverse the sale. `sourceId` = Stripe refund id (unique).
 *
 * A payment that included a tip was originally posted split across TWO
 * accounts (postPaymentRevenue: CR 4000 service + CR 4100 tip) — refunding
 * it must reverse both in the same proportion, or the refund silently
 * over-reverses Service Revenue while leaving the whole tip permanently
 * sitting in Tips. `originalTotalCents`/`originalTipCents` describe the
 * ORIGINAL payment being refunded (not this refund), so a partial refund
 * splits at the same service/tip ratio the sale itself was posted with —
 * e.g. a $150 payment ($100 service + $50 tip) refunded $60 reverses $40
 * service / $20 tip, not $60 straight off service. Omit them (or a
 * zero/undefined tip) for a tip-free payment: behaves exactly as before,
 * one full debit to 4000.
 */
export async function postRefundToLedger(opts: {
  tenantId: string
  sourceId: string
  amountCents: number
  memo?: string
  originalTotalCents?: number
  originalTipCents?: number
}): Promise<PostAdjResult> {
  const { tenantId, sourceId, amountCents, originalTotalCents, originalTipCents } = opts
  if (await journalEntryExists(tenantId, 'refund', sourceId)) return { posted: false, reason: 'already_posted' }
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  // Guard every input: a missing/zero original total, or a tip that's ≥ the
  // total (bad data), degrades to the pre-existing all-to-4000 behavior
  // instead of posting a nonsensical or negative split.
  const originalTotal = Math.max(0, Math.round(Number(originalTotalCents) || 0))
  const originalTip = Math.max(0, Math.min(originalTotal, Math.round(Number(originalTipCents) || 0)))
  const tipRatio = originalTotal > 0 ? originalTip / originalTotal : 0
  const tipRefundCents = tipRatio > 0 ? Math.min(amountCents, Math.round(amountCents * tipRatio)) : 0
  const serviceRefundCents = amountCents - tipRefundCents

  await ensureChartAccounts(tenantId)
  const [revenueAcctId, undepositedId, tipsAcctId] = await Promise.all([
    getAccountIdByCode(tenantId, '4000'),
    getAccountIdByCode(tenantId, '1050'),
    tipRefundCents > 0 ? getAccountIdByCode(tenantId, '4100') : Promise.resolve(null),
  ])
  if (!revenueAcctId || !undepositedId || (tipRefundCents > 0 && !tipsAcctId)) {
    return { posted: false, reason: 'accounts_missing' }
  }

  const lines: JournalLineInput[] = []
  if (serviceRefundCents > 0) lines.push({ coa_id: revenueAcctId, debit_cents: serviceRefundCents, memo: 'Refund (revenue reversal)' })
  if (tipRefundCents > 0 && tipsAcctId) lines.push({ coa_id: tipsAcctId, debit_cents: tipRefundCents, memo: 'Refund (tip reversal)' })
  lines.push({ coa_id: undepositedId, credit_cents: amountCents, memo: 'Refund paid out' })

  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: await tenantEntryDate(tenantId),
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
    entry_date: await tenantEntryDate(tenantId),
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
    { coa_id: acct['6045'], debit_cents: amt, memo: 'Referral commission earned' },
    { coa_id: acct['2400'], credit_cents: amt, memo: 'Commission payable' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: await tenantEntryDate(tenantId),
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
    .select('commission_cents')
    .eq('tenant_id', tenantId)
    .eq('id', commissionId)
    .maybeSingle()
  if (!c) return { posted: false, reason: 'not_found' }
  const amt = Number(c.commission_cents) || 0
  if (amt <= 0) return { posted: false, reason: 'zero_amount' }

  await postCommissionAccrual({ tenantId, commissionId }).catch(() => {})
  const acct = await resolveAccounts(tenantId, ['2400', '1010'])
  if (!acct) return { posted: false, reason: 'accounts_missing' }
  const lines: JournalLineInput[] = [
    { coa_id: acct['2400'], debit_cents: amt, memo: 'Commission paid' },
    { coa_id: acct['1010'], credit_cents: amt, memo: 'Commission payout' },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: await tenantEntryDate(tenantId),
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
    entry_date: await tenantEntryDate(tenantId),
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
    entry_date: await tenantEntryDate(tenantId),
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
 * Resolve a tenant id (and payment memo) from a Stripe payment_intent, used by
 * refund/dispute webhook handlers where only the charge/intent is known.
 */
export async function tenantFromPaymentIntent(paymentIntentId: string): Promise<{ tenantId: string; bookingId: string | null } | null> {
  if (!paymentIntentId) return null
  const { data } = await supabaseAdmin
    .from('payments')
    .select('tenant_id, booking_id')
    .eq('stripe_payment_intent_id', paymentIntentId)
    .limit(1)
    .maybeSingle()
  if (!data?.tenant_id) return null
  return { tenantId: data.tenant_id as string, bookingId: (data.booking_id as string) || null }
}
