import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const [
      { count: clientCount },
      { count: bookingCount },
      { count: leadCount },
      { count: notificationCount },
    ] = await Promise.all([
      supabaseAdmin
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabaseAdmin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .in('status', ['scheduled', 'confirmed']),
      supabaseAdmin
        .from('website_visits')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId),
      supabaseAdmin
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('read', false),
    ])

    return NextResponse.json({
      clients: clientCount || 0,
      bookings: bookingCount || 0,
      leads: leadCount || 0,
      notifications: notificationCount || 0,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
