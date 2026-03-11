import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'

export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError

  const { data: tenants, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, plan, status, created_at, owner_email, owner_name')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tenantIds = (tenants || []).map((t) => t.id)

  let settingsMap: Record<string, { billing_email?: string; stripe_customer_id?: string; subscription_status?: string }> = {}

  if (tenantIds.length > 0) {
    const { data: settings } = await supabaseAdmin
      .from('tenant_settings')
      .select('tenant_id, key, value')
      .in('tenant_id', tenantIds)
      .in('key', ['billing_email', 'stripe_customer_id', 'subscription_status'])

    for (const s of settings || []) {
      if (!settingsMap[s.tenant_id]) settingsMap[s.tenant_id] = {}
      settingsMap[s.tenant_id][s.key as keyof typeof settingsMap[string]] = s.value
    }
  }

  const enriched = (tenants || []).map((t) => ({
    ...t,
    billing: settingsMap[t.id] || {},
  }))

  const pending = enriched.filter((t) => t.status === 'pending').length
  const active = enriched.filter((t) => t.status === 'active').length
  const suspended = enriched.filter((t) => t.status === 'suspended').length
  const cancelled = enriched.filter((t) => t.status === 'cancelled').length

  return NextResponse.json({
    total: enriched.length,
    pending,
    active,
    suspended,
    cancelled,
    tenants: enriched,
  })
}

export async function PUT(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenantId, status, plan } = await request.json()
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }
  if (!status && !plan) {
    return NextResponse.json({ error: 'status or plan is required' }, { status: 400 })
  }

  const updates: Record<string, string> = {}
  if (status) updates.status = status
  if (plan) updates.plan = plan

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', tenantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { tenantId } = await request.json()
  if (!tenantId) {
    return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ status: 'active' })
    .eq('id', tenantId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
