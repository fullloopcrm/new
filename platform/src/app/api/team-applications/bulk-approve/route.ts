import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'
import { provisionApprovedApplicant, type ApprovedApplication } from '@/lib/team-provisioning'

/**
 * POST /api/team-applications/bulk-approve
 *
 * Global (all tenants): approve every pending application for the current
 * tenant in one action. Each approved applicant is provisioned as a team member
 * (PIN + portal) and emailed the branded "you're approved" email — identical to
 * single-approve, just applied across the whole pending queue.
 *
 * Provisioning per applicant is best-effort: a failure emailing/provisioning one
 * applicant never blocks the others, and the status update stands regardless.
 *
 * The claiming UPDATE re-checks status='pending' in its own WHERE and returns
 * only the rows it actually flipped (mirrors PUT /api/team-applications' CAS).
 * Without this, two concurrent "Approve All" calls (double-click, or a client
 * retry) would both read the same pending set before either UPDATE landed and
 * both provision+email every applicant a second time.
 */
export async function POST() {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    // Atomically claim every currently-pending application in one UPDATE and
    // get back exactly the rows THIS call claimed (0 rows if a concurrent
    // call already claimed them first).
    const { data: claimed, error: updErr } = await supabaseAdmin
      .from('team_applications')
      .update({ status: 'approved' })
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'pending')
      .select('id, name, email, phone, address')

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })
    if (!claimed || claimed.length === 0) {
      return NextResponse.json({ approved: 0, provisioned: 0, failures: [], message: 'No pending applications' })
    }

    // Provision + email each applicant. Best-effort, isolated per applicant.
    const failures: Array<{ id: string; name: string | null; error: string }> = []
    let provisioned = 0
    for (const app of claimed) {
      try {
        await provisionApprovedApplicant(tenant.tenantId, app as ApprovedApplication)
        provisioned++
      } catch (e) {
        failures.push({ id: app.id, name: app.name, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({
      approved: claimed.length,
      provisioned,
      failures,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
