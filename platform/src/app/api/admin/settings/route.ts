import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  if (tenantId) {
    // Get settings for a specific tenant
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get tenant-specific settings (wide-form, one row per tenant)
    const { data: settings } = await supabaseAdmin
      .from('tenant_settings')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()

    return NextResponse.json({ tenant, settings: settings || null })
  }

  // Platform-wide settings
  const { data: platformSettings } = await supabaseAdmin
    .from('platform_settings')
    .select('*')
    .order('key')

  // Tenant count
  const { count: tenantCount } = await supabaseAdmin
    .from('tenants')
    .select('id', { count: 'exact', head: true })

  return NextResponse.json({
    platformSettings: platformSettings || [],
    tenantCount: tenantCount || 0,
  })
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const body = await request.json()
  const { tenant_id, key, value } = body

  if (tenant_id) {
    // Update tenant-specific setting as a column on the wide-form table
    if (!key) {
      return NextResponse.json({ error: 'key is required' }, { status: 400 })
    }

    // Upsert the tenant_settings row, updating the specific column
    const { error } = await supabaseAdmin
      .from('tenant_settings')
      .upsert(
        { tenant_id, [key]: value, updated_at: new Date().toISOString() },
        { onConflict: 'tenant_id' }
      )

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  }

  // Update platform setting (key-value store)
  if (!key) {
    return NextResponse.json({ error: 'key is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('platform_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
