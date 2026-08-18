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
      .select('id, name, email, phone, address, unit, photo_url, preferred_language, service_zones, has_car, labor_only, max_travel_minutes')
      .eq('tenant_id', tenant.tenantId)
      .eq('status', 'pending')

    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 })
    if (!pending || pending.length === 0) {
      return NextResponse.json({ approved: 0, provisioned: 0, failures: [], message: 'No pending applications' })
    }

    // Flip them all to approved first (single UPDATE), then provision+email each.
    const ids = pending.map((p) => p.id)
    const { error: updErr } = await supabaseAdmin
      .from('team_applications')
      .update({ status: 'approved' })
      .in('id', ids)
      .eq('tenant_id', tenant.tenantId)

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

    // Provision + deliver PIN to each applicant. Best-effort, isolated per
    // applicant. A thrown error is a provisioning failure (goes to `failures`);
    // an approval that provisioned fine but delivered on neither channel is a
    // separate, quieter failure mode also worth surfacing — see `undelivered`.
    const failures: Array<{ id: string; name: string | null; error: string }> = []
    const undelivered: Array<{ id: string; name: string | null }> = []
    let provisioned = 0
    for (const app of pending) {
      try {
        const { emailed, texted } = await provisionApprovedApplicant(tenant.tenantId, app as ApprovedApplication)
        provisioned++
        if (!emailed && !texted) undelivered.push({ id: app.id, name: app.name })
      } catch (e) {
        failures.push({ id: app.id, name: app.name, error: e instanceof Error ? e.message : String(e) })
      }
    }

    return NextResponse.json({
      approved: pending.length,
      provisioned,
      failures,
      undelivered,
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
