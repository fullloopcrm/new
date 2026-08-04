/**
 * "Update Website" — Phase 5, on-demand resync after a tenant's profile
 * changes post-launch. Admin-only, explicit confirm-gated action (the
 * confirm dialog IS the review/approval gate — see ADMIN UI in
 * LaunchPanel.tsx). Calls the exact same generateTenantSite() Completion
 * calls at launch; full regenerate every time, not diff-and-patch — every
 * AI-written slot is already independently validated per-slot, so a bad
 * single-area generation can't corrupt the rest of the site, and a full
 * regenerate is simpler and safer to reason about than partial-update logic.
 * POST /api/admin/businesses/:id/resync-site
 */
import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { generateTenantSite } from '@/lib/generate-tenant-site'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 90

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params

  const { data: tenant, error: fetchErr } = await supabaseAdmin
    .from('tenants')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchErr || !tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }
  if (tenant.status !== 'active') {
    return NextResponse.json({ error: 'Tenant must be activated before its site can be resynced' }, { status: 400 })
  }

  try {
    const result = await generateTenantSite(id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[resync-site] error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Resync failed' }, { status: 500 })
  }
}
