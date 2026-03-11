import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  if (!tenantId) {
    // Return all tenants with their email config status
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, resend_api_key, resend_domain, email_from')
      .order('name')

    const summary = (tenants || []).map(t => ({
      tenant_id: t.id,
      tenant_name: t.name,
      configured: !!t.resend_api_key,
      domain: t.resend_domain || null,
      email_from: t.email_from || null,
    }))

    return NextResponse.json({ tenants: summary })
  }

  // Get email config for specific tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, resend_api_key, resend_domain, email_from')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Get recent email logs if table exists
  const { data: logs } = await supabaseAdmin
    .from('email_logs')
    .select('id, to_email, subject, status, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    config: {
      configured: !!tenant.resend_api_key,
      domain: tenant.resend_domain || null,
      email_from: tenant.email_from || null,
      has_api_key: !!tenant.resend_api_key,
    },
    logs: logs || [],
  })
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenant_id, resend_api_key, resend_domain, email_from } = await request.json()

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
  }

  const update: Record<string, string> = {}
  if (resend_api_key !== undefined) update.resend_api_key = resend_api_key
  if (resend_domain !== undefined) update.resend_domain = resend_domain
  if (email_from !== undefined) update.email_from = email_from

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(update)
    .eq('id', tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
