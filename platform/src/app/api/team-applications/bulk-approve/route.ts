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

    // Flip them all to approved first (single UPDATE), then provision+email each.
    // Re-check `status: 'pending'` in the UPDATE's own WHERE clause -- closes
    // the race window between the SELECT above and this UPDATE: a row that a
    // concurrent single-approve (PUT /api/team-applications) already flipped
    // to 'approved' in that window won't match here, and `.select('id')'`
    // returns only the ids THIS call actually transitioned.
    const ids = pending.map((p) => p.id)
    const { data: updated, error: updErr } = await supabaseAdmin
      .from('team_applications')
      .update({ status: 'approved' })
      .in('id', ids)
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'pending')
      .select('id')

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Only provision applicants this call actually transitioned -- a row
    // claimed by a concurrent single-approve must not be re-provisioned/
    // re-emailed here.
    const updatedIds = new Set((updated || []).map((r) => r.id))
    const toProvision = pending.filter((p) => updatedIds.has(p.id))

    // Provision + email each applicant. Best-effort, isolated per applicant.
    const failures: Array<{ id: string; name: string | null; error: string }> = []
    let provisioned = 0
    for (const app of toProvision) {
      try {
        await provisionApprovedApplicant(tenant.tenantId, app as ApprovedApplication)
        provisioned++
      } catch (e) {
        failures.push({ id: app.id, name: app.name, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({
      approved: toProvision.length,
      provisioned,
      failures,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
