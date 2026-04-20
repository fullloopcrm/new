import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(request.url)
    const cleaner_id = searchParams.get('cleaner_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const paid_status = searchParams.get('paid_status')

    let query = supabaseAdmin
      .from('bookings')
      .select('id, start_time, actual_hours, cleaner_pay, cleaner_paid, cleaner_id, clients(name), team_members(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('cleaner_pay', 'is', null)
      .order('start_time', { ascending: false })

    if (cleaner_id) query = query.eq('cleaner_id', cleaner_id)
    if (from) query = query.gte('start_time', from)
    if (to) query = query.lte('start_time', to + 'T23:59:59')
    if (paid_status === 'paid') query = query.eq('cleaner_paid', true)
    else if (paid_status === 'unpaid') query = query.or('cleaner_paid.is.null,cleaner_paid.eq.false')

    const { data: bookings, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const cleanerMap: Record<string, { cleaner_id: string; name: string; totalPay: number; totalHours: number; jobCount: number; paidTotal: number; unpaidTotal: number }> = {}
    for (const b of bookings || []) {
      const cid = b.cleaner_id
      if (!cid) continue
      const cleaner = b.team_members as unknown as { name: string } | null
      if (!cleanerMap[cid]) {
        cleanerMap[cid] = { cleaner_id: cid, name: cleaner?.name || 'Unknown', totalPay: 0, totalHours: 0, jobCount: 0, paidTotal: 0, unpaidTotal: 0 }
      }
      cleanerMap[cid].totalPay += b.cleaner_pay || 0
      cleanerMap[cid].totalHours += b.actual_hours || 0
      cleanerMap[cid].jobCount++
      if (b.cleaner_paid) cleanerMap[cid].paidTotal += b.cleaner_pay || 0
      else cleanerMap[cid].unpaidTotal += b.cleaner_pay || 0
    }

    const cleanerSummaries = Object.values(cleanerMap).sort((a, b) => b.totalPay - a.totalPay)
    const formattedBookings = (bookings || []).map(b => {
      const client = b.clients as unknown as { name: string } | null
      const cleaner = b.team_members as unknown as { name: string } | null
      return {
        id: b.id,
        date: b.start_time,
        client_name: client?.name || 'Unknown',
        cleaner_name: cleaner?.name || 'Unknown',
        cleaner_id: b.cleaner_id,
        hours: b.actual_hours || 0,
        cleaner_pay: b.cleaner_pay || 0,
        paid: !!b.cleaner_paid,
      }
    })

    return NextResponse.json({ cleanerSummaries, bookings: formattedBookings })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
