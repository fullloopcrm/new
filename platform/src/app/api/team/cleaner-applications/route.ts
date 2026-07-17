/**
 * Cleaner (job) applications — dedicated `cleaner_applications` table.
 *
 * Distinct from `/api/team-applications` (`team_applications` table, fully
 * wired to the "Applications" tab on /dashboard/team). `cleaner_applications`
 * is written by the public `/api/apply` form used by several tenant marketing
 * sites (nyc-mobile-salon, the-nyc-interior-designer, landscaping-in-nyc,
 * wash-and-fold-*) and notifies admins via `notify(type:'cleaner_application')`
 * — but until this route + /dashboard/cleaners existed, there was no admin
 * UI at all for these rows: the notification's own deep link
 * (`/admin/cleaners` -> `/dashboard/cleaners`) 404'd, and the only other
 * access was Selena's owner-only chat tools (list/approve/reject_cleaner_
 * application). Real applicants had zero visible review surface.
 */
import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('team.view')
    if (authError) return authError

    const { data, error } = await tenantDb(tenant.tenantId)
      .from('cleaner_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw error

    return NextResponse.json({ applications: data || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/team/cleaner-applications', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
