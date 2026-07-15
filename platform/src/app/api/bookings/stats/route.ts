import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('finance.view')
  if (authError) return authError
  const { tenantId } = tenant

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString()

  const [
    { count: upcoming },
    { count: thisWeek },
    { count: completed },
    { data: paidBookings },
  ] = await Promise.all([
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).in('status', ['scheduled', 'confirmed']),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).gte('start_time', now.toISOString()).lt('start_time', weekEnd),
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId).in('status', ['completed', 'paid']).gte('start_time', monthStart),
    supabaseAdmin.from('bookings').select('price')
      .eq('tenant_id', tenantId).eq('payment_status', 'paid').gte('payment_date', monthStart),
  ])

  const revenue = (paidBookings || []).reduce((sum, b) => sum + (b.price || 0), 0)

  return NextResponse.json({
    upcoming: upcoming || 0,
    thisWeek: thisWeek || 0,
    completed: completed || 0,
    revenue,
  })
}
