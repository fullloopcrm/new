/**
 * Cleaner (job) application — mark reviewed / accept / reject. Tenant-scoped.
 *
 * Mirrors the business logic Selena's owner-only chat tools already used
 * (approve_cleaner_application / reject_cleaner_application in
 * lib/selena/tools.ts) so accepting here behaves identically whether the
 * admin does it from chat or from /dashboard/cleaners. One deliberate
 * improvement over the chat tool: accept provisions the new hire through the
 * shared `provisionApprovedApplicant` helper (same one POST /api/team-
 * applications uses) instead of a bare team_members insert with no `pin` —
 * team_members.pin is the portal-login credential, and the chat tool's
 * insert never set one, so an applicant it "approved" could never actually
 * log into the team portal. Reusing the shared helper also gets phone-based
 * dedup, address geocoding, and the welcome-PIN email for free.
 *
 * `mark_reviewed` covers the third declared status the chat tools never
 * wrote either: cleaner_applications' own enum is 'pending'|'reviewed'|
 * 'accepted'|'rejected', but nothing anywhere set 'reviewed' — an admin had
 * no way to flag "I looked at this, still deciding" without accepting or
 * rejecting outright.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { provisionApprovedApplicant, type ApprovedApplication } from '@/lib/team-provisioning'

type Params = { params: Promise<{ id: string }> }

type CleanerApplicationRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant, error: authError } = await requirePermission('team.edit')
    if (authError) return authError
    const { tenantId } = tenant
    const { id } = await params

    const body = await request.json().catch(() => ({}))
    const action = body.action
    const ALLOWED_ACTIONS = new Set(['accept', 'reject', 'mark_reviewed'])
    if (typeof action !== 'string' || !ALLOWED_ACTIONS.has(action)) {
      return NextResponse.json({ error: `action must be one of: ${[...ALLOWED_ACTIONS].join(', ')}` }, { status: 400 })
    }

    const { data: fetched, error: fetchErr } = await tenantDb(tenantId)
      .from('cleaner_applications')
      .select('*')
      .eq('id', id)
      .single()
    if (fetchErr || !fetched) return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    const app = fetched as unknown as CleanerApplicationRow

    if (action === 'mark_reviewed') {
      const { data, error } = await tenantDb(tenantId)
        .from('cleaner_applications')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ application: data })
    }

    if (action === 'accept') {
      const applicant: ApprovedApplication = { id: app.id, name: app.name, email: app.email, phone: app.phone, address: app.address }
      await provisionApprovedApplicant(tenantId, applicant)

      const { data, error } = await tenantDb(tenantId)
        .from('cleaner_applications')
        .update({ status: 'accepted', reviewed_at: new Date().toISOString() })
        .eq('id', id)
        .select('*')
        .single()
      if (error) throw error
      return NextResponse.json({ application: data })
    }

    // reject
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const note = reason ? `[REJECTED ${new Date().toISOString().slice(0, 10)} — ${reason}]` : null
    const existingNotes = typeof app.notes === 'string' ? app.notes : null
    const mergedNotes = note ? (existingNotes ? `${existingNotes}\n${note}` : note) : existingNotes

    const { data, error } = await tenantDb(tenantId)
      .from('cleaner_applications')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString(), notes: mergedNotes })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ application: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/team/cleaner-applications/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
