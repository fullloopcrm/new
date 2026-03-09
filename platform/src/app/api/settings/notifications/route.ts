import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest } from '@/lib/tenant-query'

// GET notification preferences for tenant
export async function GET() {
  let tenant
  try {
    tenant = await getTenantForRequest()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data } = await supabaseAdmin
    .from('tenants')
    .select('notification_preferences')
    .eq('id', tenant.tenantId)
    .single()

  return NextResponse.json({
    preferences: data?.notification_preferences || getDefaultPreferences(),
  })
}

// PUT update notification preferences
export async function PUT(request: Request) {
  let tenant
  try {
    tenant = await getTenantForRequest()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { preferences } = await request.json()

  const { error } = await supabaseAdmin
    .from('tenants')
    .update({ notification_preferences: preferences })
    .eq('id', tenant.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

function getDefaultPreferences() {
  return {
    booking_reminder: { email: true, sms: true, in_app: true },
    booking_confirmed: { email: true, sms: false, in_app: true },
    payment_received: { email: true, sms: false, in_app: true },
    new_review: { email: true, sms: false, in_app: true },
    new_referral: { email: false, sms: false, in_app: true },
    daily_summary: { email: true, sms: false, in_app: false },
    follow_up: { email: true, sms: false, in_app: false },
    team_checkin: { email: false, sms: false, in_app: true },
  }
}
