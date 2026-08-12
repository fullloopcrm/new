/**
 * Weekly staff payroll (Jeff, 08-10): any team member with an HR profile set
 * to comp_type='salary' + pay_period='weekly' gets an automatic Stripe
 * Connect transfer for their weekly rate — same transfer rail cleaner
 * payouts already use (stripe.transfers.create to team_members.stripe_account_id),
 * driven by a weekly cron instead of a booking event.
 *
 * Idempotency is enforced at the DB level, not just in this code: a
 * `pay_period_start` (Monday of the week being paid) is claimed via an
 * insert into team_member_payouts BEFORE any money moves. The partial unique
 * index uq_payouts_payroll_period (tenant_id, team_member_id,
 * pay_period_start) WHERE rail='payroll' makes a second insert for the same
 * person/week conflict, so a cron retry or double-fire can never double-pay
 * — it just sees "already claimed" and skips, same pattern as
 * cleaner-payout.ts's claimCleanerPayout().
 */
import Stripe from 'stripe'
import { supabaseAdmin } from '../supabase'
import { decryptSecret } from '../secret-crypto'
import { getAdminContacts } from '../admin-contacts'
import { sendSMS } from '../sms'

// Anything above this per-person weekly amount holds instead of paying, so a
// fat-fingered pay_rate_cents (e.g. an extra zero) can't drain the account
// unattended — this run has no human-approval step by design, so this cap is
// the only thing standing between a typo and a five-figure transfer.
export const WEEKLY_PAY_SANITY_CAP_CENTS = 500_000 // $5,000/week

function getStripe(apiKey: string | null | undefined): Stripe {
  const key = apiKey ? decryptSecret(apiKey) : process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Stripe not configured')
  return new Stripe(key, { apiVersion: '2025-04-30.basil' as Stripe.LatestApiVersion })
}

/** Monday of the current week in UTC, as YYYY-MM-DD — the pay period this run covers. */
function currentWeekMonday(from: Date): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()))
  const day = d.getUTCDay() // 0=Sun..6=Sat
  const diffFromMonday = day === 0 ? 6 : day - 1
  d.setUTCDate(d.getUTCDate() - diffFromMonday)
  return d.toISOString().slice(0, 10)
}

export type StaffPayrollStatus = 'paid' | 'skipped_already_paid' | 'held_over_cap' | 'failed'

export interface StaffPayrollResult {
  tenantId: string
  teamMemberId: string
  name: string
  status: StaffPayrollStatus
  amountCents: number
  error?: string
}

async function alertAdmin(tenantId: string, tenantName: string, message: string): Promise<void> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('telnyx_api_key, telnyx_phone, sms_from_number')
    .eq('id', tenantId)
    .single()
  if (!tenant?.telnyx_api_key || !tenant?.telnyx_phone) return

  const admins = await getAdminContacts(tenantId)
  const adminPhone = admins.find(a => a.phone)?.phone
  if (!adminPhone) return

  await sendSMS({
    to: adminPhone,
    body: `${tenantName}: ${message}`,
    telnyxApiKey: tenant.telnyx_api_key as string,
    telnyxPhone: (tenant.sms_from_number as string | null) || (tenant.telnyx_phone as string),
  }).catch(err => console.error('[staff-payroll] admin alert SMS failed:', err))
}

/**
 * Runs one weekly payroll pass across every tenant. Meant to be called by
 * the weekly cron only — safe to call more than once for the same week
 * (every row is idempotency-guarded), but each call still does a live
 * Stripe transfer for anyone not yet claimed, so it isn't free to retry.
 */
export async function runWeeklyStaffPayroll(): Promise<StaffPayrollResult[]> {
  const periodStart = currentWeekMonday(new Date())
  const results: StaffPayrollResult[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, stripe_api_key')
    .not('stripe_api_key', 'is', null)

  for (const tenant of tenants || []) {
    const tenantId = tenant.id as string
    const tenantName = (tenant.name as string) || tenantId

    // Two flat queries instead of an embedded join: eligibility starts from
    // "who's salaried + weekly + active" for THIS tenant — cheaper to filter
    // there first, then fetch only those team_members' Stripe status.
    const { data: profiles } = await supabaseAdmin
      .from('hr_employee_profiles')
      .select('team_member_id, pay_rate_cents')
      .eq('tenant_id', tenantId)
      .eq('comp_type', 'salary')
      .eq('pay_period', 'weekly')
      .eq('hr_status', 'active')
      .not('pay_rate_cents', 'is', null)

    const memberIds = (profiles || []).map(p => p.team_member_id as string)
    if (memberIds.length === 0) continue

    const { data: members } = await supabaseAdmin
      .from('team_members')
      .select('id, name, stripe_account_id, stripe_ready_at')
      .eq('tenant_id', tenantId)
      .in('id', memberIds)
      .not('stripe_account_id', 'is', null)
      .not('stripe_ready_at', 'is', null)

    const payRateByMemberId = new Map((profiles || []).map(p => [p.team_member_id as string, p.pay_rate_cents as number]))

    for (const raw of members || []) {
      const teamMemberId = raw.id as string
      const name = raw.name as string
      const stripeAccountId = raw.stripe_account_id as string
      const amountCents = payRateByMemberId.get(teamMemberId)

      if (!amountCents || amountCents <= 0) continue

      if (amountCents > WEEKLY_PAY_SANITY_CAP_CENTS) {
        results.push({ tenantId, teamMemberId, name, status: 'held_over_cap', amountCents })
        await alertAdmin(tenantId, tenantName, `Payroll HELD (nothing sent) — ${name}'s weekly rate is $${(amountCents / 100).toFixed(2)}, over the $5,000/week sanity cap. Check hr_rate_cents or raise the cap if it's real.`)
        continue
      }

      // Claim BEFORE moving money — a conflict here means this person/week
      // was already paid (retry-safe, not an error).
      const { data: claimed, error: claimErr } = await supabaseAdmin
        .from('team_member_payouts')
        .insert({
          tenant_id: tenantId,
          team_member_id: teamMemberId,
          booking_id: null,
          amount_cents: amountCents,
          rail: 'payroll',
          status: 'pending',
          pay_period_start: periodStart,
        })
        .select('id')
        .single()

      if (claimErr || !claimed) {
        results.push({ tenantId, teamMemberId, name, status: 'skipped_already_paid', amountCents })
        continue
      }

      try {
        const stripe = getStripe(tenant.stripe_api_key as string)
        const transfer = await stripe.transfers.create({
          amount: amountCents,
          currency: 'usd',
          destination: stripeAccountId,
          description: `Weekly payroll — ${name} (week of ${periodStart})`,
          metadata: { team_member_id: teamMemberId, tenant_id: tenantId, pay_period_start: periodStart },
        }, { idempotencyKey: `staff-payroll:${tenantId}:${teamMemberId}:${periodStart}` })

        await supabaseAdmin
          .from('team_member_payouts')
          .update({ status: 'transferred', stripe_transfer_id: transfer.id, paid_at: new Date().toISOString() })
          .eq('tenant_id', tenantId)
          .eq('id', claimed.id)

        results.push({ tenantId, teamMemberId, name, status: 'paid', amountCents })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Transfer failed'
        await supabaseAdmin
          .from('team_member_payouts')
          .update({ status: 'failed', error_message: message })
          .eq('tenant_id', tenantId)
          .eq('id', claimed.id)
        await alertAdmin(tenantId, tenantName, `Payroll FAILED — ${name}, $${(amountCents / 100).toFixed(2)}: ${message}`)
        results.push({ tenantId, teamMemberId, name, status: 'failed', amountCents, error: message })
      }
    }
  }

  return results
}
