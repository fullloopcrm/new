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
 * Clawback guard: when a booking's revenue gets reversed (refund/chargeback)
 * or the booking itself is cancelled, any commission tied to it must not be
 * left standing — the only prior path to status='void' was a manual admin
 * PATCH (PUT /api/referral-commissions, /api/sales-partner-commissions), so
 * a refunded/cancelled job silently kept its commission accrued (or worse,
 * paid) with nothing flagging it. Looks up BOTH referral_commissions and
 * sales_partner_commissions rows for the booking (they can legitimately
 * stack, see postSalesPartnerCommissionAccrual's docstring) and per row:
 *
 *   - status='pending' (accrued, never paid out) → void the row AND reverse
 *     the accrual journal entry (DR 2400/CR 6045) if one was posted, so the
 *     expense/payable doesn't linger on the books for a job that got
 *     refunded/cancelled.
 *   - status='paid' (a real Stripe Connect transfer already went out) → the
 *     money already left the account. This NEVER auto-reverses the accrual
 *     or attempts a clawback transfer — that's a real-money operation
 *     requiring human judgment. Instead it opens a high-priority admin_tasks
 *     row (idempotent — won't duplicate an already-open one) so it's never
 *     silently 'paid' with no signal anything is wrong.
 *   - status='void' already → no-op.
 *
 * Called from the charge.refunded / charge.dispute.created webhook handlers
 * and the booking cancel transition. Safe to call more than once for the
 * same booking (e.g. cancelled AND later refunded) — each row's own current
 * status gates what happens, and the ledger reversal itself is idempotent
 * via postJournalEntry's (tenant, source, source_id) uniqueness.
 */
export async function voidCommissionsForBooking(opts: {
  tenantId: string
  bookingId: string
  reason: string
}): Promise<{ voided: number; flagged: number }> {
  const { tenantId, bookingId, reason } = opts
  let voided = 0
  let flagged = 0

  const { data: refRows } = await supabaseAdmin
    .from('referral_commissions')
    .select('id, status, commission_cents')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
  for (const row of refRows || []) {
    const outcome = await voidOneCommission({
      tenantId,
      commissionId: row.id as string,
      status: row.status as string,
      commissionCents: Number(row.commission_cents) || 0,
      table: 'referral_commissions',
      accrualSource: 'commission',
      voidSource: 'commission_void',
      relatedType: 'referral_commission',
      taskTitle: 'Referral commission needs clawback review',
      reason,
    })
    if (outcome === 'voided') voided++
    if (outcome === 'flagged') flagged++
  }

  const { data: spRows } = await supabaseAdmin
    .from('sales_partner_commissions')
    .select('id, status, commission_cents')
    .eq('tenant_id', tenantId)
    .eq('booking_id', bookingId)
  for (const row of spRows || []) {
    const outcome = await voidOneCommission({
      tenantId,
      commissionId: row.id as string,
      status: row.status as string,
      commissionCents: Number(row.commission_cents) || 0,
      table: 'sales_partner_commissions',
      accrualSource: 'sales_partner_commission',
      voidSource: 'sales_partner_commission_void',
      relatedType: 'sales_partner_commission',
      taskTitle: 'Sales partner commission needs clawback review',
      reason,
    })
    if (outcome === 'voided') voided++
    if (outcome === 'flagged') flagged++
  }

  return { voided, flagged }
}

async function voidOneCommission(opts: {
  tenantId: string
  commissionId: string
  status: string
  commissionCents: number
  table: 'referral_commissions' | 'sales_partner_commissions'
  accrualSource: string
  voidSource: string
  relatedType: string
  taskTitle: string
  reason: string
}): Promise<'voided' | 'flagged' | 'skipped'> {
  const { tenantId, commissionId, status, commissionCents, table, accrualSource, voidSource, relatedType, taskTitle, reason } = opts

  if (status === 'void') return 'skipped'

  if (status === 'paid') {
    // Real money already moved via Connect transfer. Never claw it back
    // automatically — flag for a human instead. sales_partner_commissions.status
    // has a DB CHECK constraint limited to pending|paid|void, so the flag lives
    // in admin_tasks rather than a new status value (works for both tables the
    // same way, no migration needed).
    const { data: existingTask } = await supabaseAdmin
      .from('admin_tasks')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('type', 'commission_clawback_review')
      .eq('related_id', commissionId)
      .eq('status', 'open')
      .maybeSingle()
    if (existingTask) return 'flagged'
    await supabaseAdmin
      .from('admin_tasks')
      .insert({
        tenant_id: tenantId,
        type: 'commission_clawback_review',
        priority: 'high',
        status: 'open',
        title: taskTitle,
        description: `Commission ${commissionId} ($${(commissionCents / 100).toFixed(2)}) was already paid out via Stripe Connect, but ${reason}. The transfer was NOT automatically reversed — review and claw back manually if appropriate.`,
        related_type: relatedType,
        related_id: commissionId,
      })
      .then(() => {}, (err: unknown) => console.error('[post-adjustments] clawback-review task insert failed', commissionId, err))
    return 'flagged'
  }

  // status is 'pending' (or any other non-terminal value) — void it. The
  // `.neq('status', 'paid')` CAS guards the race where the commission flips
  // to 'paid' underneath us between our read and this write (same pattern as
  // PUT /api/referral-commissions' mark-paid claim) — if that happens the
  // update matches zero rows and we skip rather than voiding a commission
  // that just got a real payout.
  const { data: updated } = await supabaseAdmin
    .from(table)
    .update({ status: 'void' })
    .eq('id', commissionId)
    .eq('tenant_id', tenantId)
    .neq('status', 'paid')
    .select('id')
    .maybeSingle()
  if (!updated) return 'skipped'

  if (commissionCents > 0 && (await journalEntryExists(tenantId, accrualSource, commissionId))) {
    const acct = await resolveAccounts(tenantId, ['6045', '2400'])
    if (acct) {
      await postJournalEntry({
        tenant_id: tenantId,
        entry_date: await tenantEntryDate(tenantId),
        memo: 'Commission voided',
        source: voidSource,
        source_id: commissionId,
        lines: [
          { coa_id: acct['2400'], debit_cents: commissionCents, memo: 'Commission voided — payable cleared' },
          { coa_id: acct['6045'], credit_cents: commissionCents, memo: 'Commission voided — expense reversed' },
        ],
      }).catch((e) => console.error('[post-adjustments] commission void reversal failed', commissionId, e))
    }
  }
  return 'voided'
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
