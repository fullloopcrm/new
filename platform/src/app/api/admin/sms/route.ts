import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  if (!tenantId) {
    // Return all tenants with their SMS config status
    const { data: tenants } = await supabaseAdmin
      .from('tenants')
      .select('id, name, telnyx_api_key, telnyx_phone')
      .order('name')

    const summary = (tenants || []).map(t => ({
      tenant_id: t.id,
      tenant_name: t.name,
      configured: !!t.telnyx_api_key && !!t.telnyx_phone,
      has_api_key: !!t.telnyx_api_key,
      has_phone: !!t.telnyx_phone,
      phone: t.telnyx_phone || null,
    }))

    return NextResponse.json({ tenants: summary })
  }

  // Get SMS config for specific tenant
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
  }

  // Get recent SMS conversations
  const { data: conversations } = await supabaseAdmin
    .from('sms_conversations')
    .select('id, client_id, status, last_message_at, clients(name, phone)')
    .eq('tenant_id', tenantId)
    .order('last_message_at', { ascending: false })
    .limit(50)

  // Get recent SMS messages
  const { data: recentMessages } = await supabaseAdmin
    .from('client_sms_messages')
    .select('id, direction, message, created_at, clients(name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({
    config: {
      configured: !!tenant.telnyx_api_key && !!tenant.telnyx_phone,
      has_api_key: !!tenant.telnyx_api_key,
      phone: tenant.telnyx_phone || null,
    },
    conversations: conversations || [],
    recentMessages: recentMessages || [],
  })
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenant_id, telnyx_api_key, telnyx_phone } = await request.json()

  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 })
  }

  const update: Record<string, string> = {}
  if (telnyx_api_key !== undefined) update.telnyx_api_key = telnyx_api_key
  if (telnyx_phone !== undefined) update.telnyx_phone = telnyx_phone

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(update)
    .eq('id', tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
