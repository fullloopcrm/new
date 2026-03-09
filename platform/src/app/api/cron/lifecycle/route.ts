import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Update client lifecycle: New→Active→At-Risk→Churned based on booking recency
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 3600 * 1000)

  // Get all active clients with their latest booking
  const { data: clients } = await supabaseAdmin
    .from('clients')
    .select('id, tenant_id, status, created_at')
    .not('status', 'eq', 'do_not_contact')

  let updated = 0

  for (const client of clients || []) {
    // Get latest completed booking
    const { data: latestBooking } = await supabaseAdmin
      .from('bookings')
      .select('start_time')
      .eq('client_id', client.id)
      .in('status', ['completed', 'paid'])
      .order('start_time', { ascending: false })
      .limit(1)

    let newStatus = 'active'
    const lastService = latestBooking?.[0]?.start_time
      ? new Date(latestBooking[0].start_time)
      : null

    if (!lastService) {
      // Never had a service
      const created = new Date(client.created_at)
      newStatus = created > thirtyDaysAgo ? 'active' : 'inactive'
    } else if (lastService < ninetyDaysAgo) {
      newStatus = 'inactive' // Churned
    } else if (lastService < thirtyDaysAgo) {
      newStatus = 'active' // At-risk but still active
    }

    if (newStatus !== client.status) {
      await supabaseAdmin
        .from('clients')
        .update({ status: newStatus })
        .eq('id', client.id)
      updated++
    }
  }

  return NextResponse.json({ clients_updated: updated })
}
