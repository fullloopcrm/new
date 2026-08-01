/**
 * Labor → ledger. The other half of the money spine: every dollar paid to a
 * worker posts a balanced journal entry the moment it goes out, so labor cost
 * shows up in the books (and P&L) in real time instead of never.
 *
 * Which expense account depends on employment type, read from the HR
 * comp-of-record (single source of truth):
 *   1099 contractor → 5000 Contractor Pay
 *   W-2 employee    → 5010 Wages (W-2)
 *
 * Posting (cash-basis):
 *   DR 5000/5010 Labor   (amount + tip passed through)
 *     CR 2450 Payouts in Transit   (clearing)
 * The bank-withdrawal match later moves 2450 → 1010 (bank), so the payout is
 * symmetric with revenue's 1050 clearing and can't be double-counted when the
 * bank line is categorized. Tip passthrough nets against the 4100 Tips income
 * booked on the payment, so pass-through tips wash out on the P&L.
 *
 * Idempotent by (source, source_id): 'payout' for Stripe/auto payouts,
 * 'payroll' for manual payroll runs. Safe to call from multiple sites + backfill.
 */
import { supabaseAdmin } from '../supabase'
import {
  postJournalEntry,
  ensureChartAccounts,
  getAccountIdByCode,
  journalEntryExists,
  type JournalLineInput,
} from '../ledger'

// Payout statuses that mean money actually moved.
const PAID_PAYOUT_STATUSES = ['transferred', 'paid', 'succeeded', 'completed']

export interface PostLaborResult {
  posted: boolean
  reason?: string
  entryId?: string
}

/**
 * Resolve the labor expense account for a worker by their HR employment type.
 * Defaults to 1099/Contractor Pay when no HR profile exists yet. Exported so
 * post-revenue.ts's booking-level labor accrual (for tenants with no
 * ledger-postable payout signal, e.g. manual Zelle/Venmo payments) routes to
 * the same account a real payout/payroll post would, instead of hardcoding
 * 5000 regardless of employment type.
 */
export async function laborAccountId(tenantId: string, teamMemberId: string | null): Promise<string | null> {
  let code = '5000'
  if (teamMemberId) {
    const { data: profile } = await supabaseAdmin
      .from('hr_employee_profiles')
      .select('employment_type')
      .eq('tenant_id', tenantId)
      .eq('team_member_id', teamMemberId)
      .maybeSingle()
    if (profile?.employment_type === 'employee_w2') code = '5010'
  }
  await ensureChartAccounts(tenantId)
  return getAccountIdByCode(tenantId, code)
}

async function postLabor(opts: {
  tenantId: string
  source: 'payout' | 'payroll'
  sourceId: string
  teamMemberId: string | null
  amountCents: number
  memo: string
}): Promise<PostLaborResult> {
  const { tenantId, source, sourceId, teamMemberId, amountCents, memo } = opts
  if (await journalEntryExists(tenantId, source, sourceId)) {
    return { posted: false, reason: 'already_posted' }
  }
  if (amountCents <= 0) return { posted: false, reason: 'zero_amount' }

  const [laborAcct, transitAcct] = await Promise.all([
    laborAccountId(tenantId, teamMemberId),
    getAccountIdByCode(tenantId, '2450'),
  ])
  if (!laborAcct || !transitAcct) return { posted: false, reason: 'accounts_missing' }

  const lines: JournalLineInput[] = [
    { coa_id: laborAcct, debit_cents: amountCents, memo },
    { coa_id: transitAcct, credit_cents: amountCents, memo },
  ]
  const entryId = await postJournalEntry({
    tenant_id: tenantId,
    entry_date: new Date().toISOString().slice(0, 10),
    memo,
    source,
    source_id: sourceId,
    lines,
  })
  // NULL means a concurrent caller already claimed this (source, source_id)
  // between our journalEntryExists() check above and this insert.
  if (entryId === null) return { posted: false, reason: 'already_posted' }
  return { posted: true, entryId }
}

/** Post a Stripe/auto contractor payout (team_member_payouts row) to the ledger. */
export async function postPayoutToLedger(opts: { tenantId: string; payoutId: string }): Promise<PostLaborResult> {
  const { tenantId, payoutId } = opts
  const { data: payout } = await supabaseAdmin
    .from('team_member_payouts')
    .select('id, team_member_id, amount_cents, tip_cents, status')
    .eq('tenant_id', tenantId)
    .eq('id', payoutId)
    .maybeSingle()
  if (!payout) return { posted: false, reason: 'not_found' }
  if (!PAID_PAYOUT_STATUSES.includes((payout.status as string) || '')) {
    return { posted: false, reason: `status_${payout.status}` }
  }
  const total = (Number(payout.amount_cents) || 0) + Math.max(0, Number(payout.tip_cents) || 0)
  return postLabor({
    tenantId,
    source: 'payout',
    sourceId: payoutId,
    teamMemberId: (payout.team_member_id as string) || null,
    amountCents: total,
    memo: 'Contractor payout',
  })
}

/**
 * Sum of team_member_pay across this member's completed-not-yet-paid bookings
 * that ALREADY have a 'booking_cogs' journal entry (see post-revenue.ts).
 * payroll_payments has no per-booking link, so a manual payroll run has no
 * direct way to know it's re-covering money booking_cogs already accrued for
 * the same jobs -- this is the closest real proxy: the same booking set
 * payroll-pending.ts already treats as "what this member is owed."
 */
async function alreadyAccruedViaBookingCogs(tenantId: string, teamMemberId: string): Promise<number> {
  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, team_member_pay')
    .eq('tenant_id', tenantId)
    .eq('team_member_id', teamMemberId)
    .eq('status', 'completed')
    .not('team_member_paid', 'is', true)
  let sum = 0
  for (const b of bookings || []) {
    const pay = Math.round(Number(b.team_member_pay) || 0)
    if (pay > 0 && (await journalEntryExists(tenantId, 'booking_cogs', b.id as string))) sum += pay
  }
  return sum
}

/**
 * Post a manual payroll payment (payroll_payments row) to the ledger.
 *
 * Nets out any portion of the payment that booking_cogs already accrued for
 * this member's pending bookings (see alreadyAccruedViaBookingCogs above) --
 * without this, a payroll run that lags behind the finance-post cron (the
 * common case: cron runs continuously off customer payment; a manual payroll
 * run happens whenever the admin gets to it, often days later) would post the
 * SAME job's labor cost twice: once as 'booking_cogs' when the customer paid,
 * again here when the admin actually pays the worker. The worker is still
 * genuinely owed the FULL payroll amount in cash (payroll-pending.ts's
 * "pending" figure is intentionally untouched by this) -- only the GL-side
 * expense re-recognition is suppressed for the already-accrued portion.
 */
export async function postPayrollToLedger(opts: { tenantId: string; payrollPaymentId: string }): Promise<PostLaborResult> {
  const { tenantId, payrollPaymentId } = opts
  const { data: row } = await supabaseAdmin
    .from('payroll_payments')
    .select('id, team_member_id, amount')
    .eq('tenant_id', tenantId)
    .eq('id', payrollPaymentId)
    .maybeSingle()
  if (!row) return { posted: false, reason: 'not_found' }

  const teamMemberId = (row.team_member_id as string) || null
  const rawAmount = Number(row.amount) || 0
  const alreadyAccrued = teamMemberId ? await alreadyAccruedViaBookingCogs(tenantId, teamMemberId) : 0
  const amountCents = Math.max(0, rawAmount - alreadyAccrued)

  return postLabor({
    tenantId,
    source: 'payroll',
    sourceId: payrollPaymentId,
    teamMemberId,
    amountCents,
    memo: alreadyAccrued > 0
      ? `Payroll payment ($${(rawAmount / 100).toFixed(2)} total, $${(alreadyAccrued / 100).toFixed(2)} already accrued via booking_cogs)`
      : 'Payroll payment',
  })
}

/** Safety net + retro-post: post any labor rows lacking a journal entry. */
export async function backfillUnpostedLabor(tenantId: string, limit = 500): Promise<{ payouts: number; payroll: number }> {
  let payouts = 0
  let payroll = 0

  const { data: payoutRows } = await supabaseAdmin
    .from('team_member_payouts')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', PAID_PAYOUT_STATUSES)
    .order('created_at', { ascending: true })
    .limit(limit)
  for (const p of payoutRows || []) {
    try {
      const r = await postPayoutToLedger({ tenantId, payoutId: p.id as string })
      if (r.posted) payouts++
    } catch (e) {
      console.error('[post-labor] payout backfill failed', p.id, e)
    }
  }

  const { data: payrollRows } = await supabaseAdmin
    .from('payroll_payments')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(limit)
  for (const p of payrollRows || []) {
    try {
      const r = await postPayrollToLedger({ tenantId, payrollPaymentId: p.id as string })
      if (r.posted) payroll++
    } catch (e) {
      console.error('[post-labor] payroll backfill failed', p.id, e)
    }
  }

  return { payouts, payroll }
}
