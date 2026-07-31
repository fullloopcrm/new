/**
 * Legal Overlook — daily check that surfaces attorney-approved static tips
 * on the dashboard when a tenant's own structured data matches a trigger
 * (license expiring/missing, insurance expiring/missing). Deliberately does
 * NOT read comms/messages/free text — that would require interpreting
 * content live, which is the exact liability this feature is built to avoid.
 * Tips are scoped to the tenant's actual trade (tenants.industry) AND actual
 * business-address state (entities.state) — a NY plumber only ever sees
 * NY + plumbing tips, never another trade's or another state's.
 * Shared matching logic lives in @/lib/legal-overlook (also called directly
 * on tenant activation so a brand-new tenant doesn't wait for this cron).
 * See src/app/dashboard/legal/page.tsx and migrations/2026_07_27_legal_overlook.sql.
 */
import { NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/cron-auth'
import { runLegalOverlookCheck } from '@/lib/legal-overlook'

export const maxDuration = 120

export async function GET(request: Request) {
  const cronAuthError = verifyCronSecret(request)
  if (cronAuthError) return cronAuthError

  try {
    const { surfaced } = await runLegalOverlookCheck()
    return NextResponse.json({ success: true, surfaced })
  } catch (err) {
    console.error('[legal-overlook-check] failed:', err)
    return NextResponse.json({ success: false, error: err instanceof Error ? err.message : 'Failed' }, { status: 500 })
  }
}
