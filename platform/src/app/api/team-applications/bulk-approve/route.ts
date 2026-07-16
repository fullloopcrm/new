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
 */
export async function POST() {
  const { tenant, error: authError } = await requirePermission('team.edit')
  if (authError) return authError

  try {
    // Grab all pending applications for this tenant.
    const { data: pending, error: fetchErr } = await supabaseAdmin
      .from('team_applications')
      .select('id, name, email, phone, address')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'pending')

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!pending || pending.length === 0) {
      return NextResponse.json({ approved: 0, provisioned: 0, failures: [], message: 'No pending applications' })
    }

    // Flip them all to approved (single UPDATE), then provision+email each.
    // Re-check status:'pending' in the UPDATE's own WHERE -- between the
    // fetch above and this write, a single approve/reject click (PUT) could
    // have already decided one of these rows. Without the re-check this
    // would blindly overwrite that decision back to 'approved' and
    // provision/email an applicant an admin had just rejected. .select()
    // back only the rows this call actually won, so provisioning never runs
    // for a row that lost the race.
    const ids = pending.map((p) => p.id)
    const { data: won, error: updErr } = await supabaseAdmin
      .from('team_applications')
      .update({ status: 'approved' })
      .in('id', ids)
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'pending')
      .select('id, name, email, phone, address')

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    const approved = won || []

    // Provision + email each applicant. Best-effort, isolated per applicant.
    const failures: Array<{ id: string; name: string | null; error: string }> = []
    let provisioned = 0
    for (const app of approved) {
      try {
        await provisionApprovedApplicant(tenant.tenantId, app as ApprovedApplication)
        provisioned++
      } catch (e) {
        failures.push({ id: app.id, name: app.name, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({
      approved: approved.length,
      provisioned,
      failures,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
