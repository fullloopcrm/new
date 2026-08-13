/**
 * Cleaner payout sweep cron — every 15 min, all tenants, one shared cadence
 * (CLAUDE.md GLOBAL RULE — no per-tenant forks). Catches money still owed to
 * a cleaner that arrived AFTER an earlier payout already claimed that
 * booking+cleaner's payout slot (a tip via a Stripe payment link that
 * clears minutes-to-days after checkout's base-pay auto-payout, an
 * overpayment) — structurally invisible to both the checkout-time and
 * Stripe-webhook auto-payout paths, since each only ever fires once per
 * booking+cleaner and previously had no way to record a second installment.
 * See supabase/migrations/20260812190000_payout_source_ref_staged_payouts.sql
 * for the schema fix that made a second installment representable at all;
 * lib/finance/cleaner-payout-sweep.ts for the pay-or-flag logic.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { supabaseAdmin } from '@/lib/supabase'
import { runCleanerPayoutSweepForTenant } from '@/lib/finance/cleaner-payout-sweep'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  let paid = 0
  let flagged = 0
  const errors: string[] = []

  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('status', 'active')
    .limit(1000)

  for (const tenant of tenants || []) {
    try {
      const r = await runCleanerPayoutSweepForTenant(tenant.id as string)
      paid += r.paid
      flagged += r.flagged
      errors.push(...r.errors.map(e => `tenant ${tenant.id}: ${e}`))
    } catch (e) {
      errors.push(`tenant ${tenant.id}: ${e instanceof Error ? e.message : 'unknown'}`)
    }
  }

  // Health-monitor marker.
  await supabaseAdmin.from('notifications').insert({  // tenant-scope-ok: cron job runs platform-wide across all tenants by design
    type: 'cleaner_payout_sweep_fired',
    title: 'cron:cleaner-payout-sweep',
    message: `paid=${paid} flagged=${flagged}`,
    channel: 'system',
    recipient_type: 'admin',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, paid, flagged, errors: errors.length ? errors : undefined })
}
