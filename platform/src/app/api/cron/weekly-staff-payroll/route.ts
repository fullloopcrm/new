/**
 * Weekly cron: pays every salaried, weekly-pay-period team member across
 * every tenant via Stripe Connect transfer. See src/lib/finance/staff-payroll.ts
 * for the idempotency + sanity-cap guardrails — this route is just the
 * cron entry point.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runWeeklyStaffPayroll } from '@/lib/finance/staff-payroll'

export const maxDuration = 60

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  const results = await runWeeklyStaffPayroll()
  const summary = {
    paid: results.filter(r => r.status === 'paid').length,
    already_paid: results.filter(r => r.status === 'skipped_already_paid').length,
    held_over_cap: results.filter(r => r.status === 'held_over_cap').length,
    failed: results.filter(r => r.status === 'failed').length,
  }

  return NextResponse.json({ summary, results })
}
