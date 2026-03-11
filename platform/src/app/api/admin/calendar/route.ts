import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const url = request.nextUrl
  const tenantId = url.searchParams.get('tenant_id')
  const dateFrom = url.searchParams.get('date_from')
  const dateTo = url.searchParams.get('date_to')

  // Default to current month if no dates
  const now = new Date()
  const from = dateFrom || new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const to = dateTo || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()

  let query = supabaseAdmin
    .from('bookings')
    .select('id, start_time, end_time, status, notes, tenant_id, clients(name, phone), team_members(name), tenants(name)')
    .gte('start_time', from)
    .lte('start_time', to)
    .not('status', 'eq', 'cancelled')
    .order('start_time', { ascending: true })

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by date for calendar view
  const byDate: Record<string, typeof data> = {}
  for (const booking of data || []) {
    const dateKey = booking.start_time.split('T')[0]
    if (!byDate[dateKey]) byDate[dateKey] = []
    byDate[dateKey].push(booking)
  }

  return NextResponse.json({
    bookings: data || [],
    byDate,
    dateRange: { from, to },
  })
}
