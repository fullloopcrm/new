// Head-tenant side of the multi-location/franchise foundation.
//   GET  — list this tenant's direct sub-tenants (locations).
//   POST — create a new sub-tenant under this tenant, seeded from its
//          brand/industry/selena_config (see create-sub-tenant.ts). Identity,
//          contact, billing, and credentials are never inherited — every
//          sub-tenant is independently billed from the moment it's created.
import { NextRequest, NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { createSubTenant } from '@/lib/create-sub-tenant'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select('id, name, slug, industry, status, created_at')
      .eq('parent_tenant_id', tenantId)
      .order('created_at', { ascending: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ subTenants: data || [] })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tenantId, role } = await getTenantForRequest()
    if (role !== 'owner') {
      return NextResponse.json({ error: 'Only the tenant owner can add a location' }, { status: 403 })
    }
    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    const result = await createSubTenant({
      parentTenantId: tenantId,
      name,
      ownerEmail: body?.ownerEmail ?? null,
      ownerName: body?.ownerName ?? null,
      ownerPhone: body?.ownerPhone ?? null,
      address: body?.address ?? null,
      zipCode: body?.zipCode ?? null,
      phone: body?.phone ?? null,
      email: body?.email ?? null,
    })

    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
    return NextResponse.json({ tenant: result.tenant })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    return NextResponse.json({ error: 'unexpected error' }, { status: 500 })
  }
}
