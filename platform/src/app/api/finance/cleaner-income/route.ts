import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET(request: NextRequest) {
  try {
    const { tenantId } = await getTenantForRequest()
    const { searchParams } = new URL(request.url)
    const team_member_id = searchParams.get('team_member_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const paid_status = searchParams.get('paid_status')

    let query = supabaseAdmin
      .from('bookings')
      .select('id, start_time, actual_hours, team_member_pay, team_member_paid, team_member_id, clients(name), team_members(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('team_member_pay', 'is', null)
      .order('start_time', { ascending: false })

    if (team_member_id) query = query.eq('team_member_id', team_member_id)
    if (from) query = query.gte('start_time', from)
    if (to) query = query.lte('start_time', to + 'T23:59:59')
    if (paid_status === 'paid') query = query.eq('team_member_paid', true)
    else if (paid_status === 'unpaid') query = query.or('team_member_paid.is.null,team_member_paid.eq.false')

    const { data: bookings, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const cleanerMap: Record<string, { team_member_id: string; name: string; totalPay: number; totalHours: number; jobCount: number; paidTotal: number; unpaidTotal: number }> = {}
    for (const b of bookings || []) {
      const cid = b.team_member_id
      if (!cid) continue
      const cleaner = b.team_members as unknown as { name: string } | null
      if (!cleanerMap[cid]) {
        cleanerMap[cid] = { team_member_id: cid, name: cleaner?.name || 'Unknown', totalPay: 0, totalHours: 0, jobCount: 0, paidTotal: 0, unpaidTotal: 0 }
      }
      cleanerMap[cid].totalPay += b.team_member_pay || 0
      cleanerMap[cid].totalHours += b.actual_hours || 0
      cleanerMap[cid].jobCount++
      if (b.team_member_paid) cleanerMap[cid].paidTotal += b.team_member_pay || 0
      else cleanerMap[cid].unpaidTotal += b.team_member_pay || 0
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
        team_member_id: b.team_member_id,
        hours: b.actual_hours || 0,
        team_member_pay: b.team_member_pay || 0,
        paid: !!b.team_member_paid,
      }
    })

    return NextResponse.json({ cleanerSummaries, bookings: formattedBookings })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
