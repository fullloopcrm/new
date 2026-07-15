/**
 * Per-tenant service area (local/national + states + zones).
 * GET  → resolved ServiceArea for the current tenant (no secrets), gated on
 *        settings.view to match PUT's settings.edit and respect the tenant's
 *        own RBAC customization (e.g. a revoked staff override).
 * PUT  → persist a new ServiceArea into tenants.selena_config.
 * Used by the operator dashboard's team page + Settings (not public).
 */
import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { getServiceArea, parseServiceArea, withServiceArea } from '@/lib/service-area'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('settings.view')
    if (authError) return authError

    const { data } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', tenant.tenantId)
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

    const { data: current } = await supabaseAdmin
      .from('tenants')
      .select('selena_config')
      .eq('id', tenant.tenantId)
      .single()

    const nextConfig = withServiceArea(current?.selena_config, area)
    const { error } = await supabaseAdmin
      .from('tenants')
      .update({ selena_config: nextConfig })
      .eq('id', tenant.tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ serviceArea: area })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'Failed to save service area' }, { status: 500 })
  }
}
