import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { logSecurityEvent } from '@/lib/security'
import { requireAdmin } from '@/lib/require-admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const db = tenantDb(id)

  const [
    { data: tenant },
    { data: members },
    { count: clients },
    { count: bookings },
    { count: team_members },
  ] = await Promise.all([
    supabaseAdmin.from('tenants').select('*').eq('id', id).single(),
    db.from('tenant_members').select('*'),
    db.from('clients').select('id', { count: 'exact', head: true }),
    db.from('bookings').select('id', { count: 'exact', head: true }),
    db.from('team_members').select('id', { count: 'exact', head: true }),
  ])

  if (!tenant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Revenue for this tenant
  const { data: revenueData } = await db
    .from('bookings')
    .select('final_price')
    .in('status', ['paid', 'completed'])

  const revenue = (revenueData || []).reduce((sum, b) => sum + (b.final_price || 0), 0)

  return NextResponse.json({
    tenant,
    members,
    stats: {
      clients: clients || 0,
      bookings: bookings || 0,
      team_members: team_members || 0,
      revenue,
    },
  })
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireAdmin()
  if (authError) return authError

  const { id } = await params
  const body = await request.json()

  // Only allow specific fields to be updated. Beyond status/plan, these are the
  // brand/config fields the shared site template renders from (see
  // src/app/site/template/_config/load.ts) so admins can personalize a new
  // tenant's site without a code change.
  const allowed = [
    'status', 'plan', 'name', 'industry',
    'phone', 'email', 'owner_email', 'owner_phone', 'sms_number',
    'domain', 'website_url', 'logo_url', 'tagline',
    'primary_color', 'secondary_color',
  ]
  const updates: Record<string, string> = {}
  for (const key of allowed) {
    if (body[key] !== undefined) updates[key] = body[key]
  }

  const { error } = await supabaseAdmin
    .from('tenants')
    .update(updates)
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Log security events for status/plan changes
  if (updates.status) {
    await logSecurityEvent({
      tenantId: id,
      type: 'status_change',
      description: `Account status changed to ${updates.status} by platform admin`,
    })
  }
  if (updates.plan) {
    await logSecurityEvent({
      tenantId: id,
      type: 'plan_change',
      description: `Plan changed to ${updates.plan} by platform admin`,
    })
  }

  return NextResponse.json({ success: true })
}
