/**
 * Per-tenant service area (local/national + states + zones).
 * GET  → resolved ServiceArea for the current tenant (no secrets).
 * PUT  → persist a new ServiceArea into tenants.selena_config.
 * Used by the team-page coverage map, onboarding, and Settings.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { getServiceArea, parseServiceArea } from '@/lib/service-area'

export async function GET() {
  try {
    const { tenant } = await getTenantForRequest()
    const { data } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', tenant.id)
      .single()
    return NextResponse.json({ serviceArea: getServiceArea(data?.selena_config) })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}

export async function PUT(request: Request) {
  const { tenant, error: authError } = await requirePermission('settings.edit')
  if (authError) return authError

  try {
    const body = await request.json()
    const area = parseServiceArea(body?.serviceArea ?? body)

    // Merge service_area into selena_config atomically in Postgres
    // (migrations/2026_07_16_tenant_jsonb_merge_atomic.sql) rather than
    // reading selena_config, spreading the new area over it in JS, and
    // blind-writing the merged blob back. This route's own save racing a
    // team/persona/permissions save on the same tenant (all of which also
    // patch selena_config) would otherwise both read the same stale blob,
    // and whichever write landed second would silently revert the other's
    // change with no error to either side -- the exact race this migration
    // already called out as unfixed on this route.
    const { error } = await supabaseAdmin.rpc('merge_tenant_selena_config', {
      p_tenant_id: tenant.tenantId,
      p_patch: { service_area: area },
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ serviceArea: area })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Failed to save service area' }, { status: 500 })
  }
}
