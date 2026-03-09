import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { verifyToken } from '../auth/route'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const auth = verifyToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const period = request.nextUrl.searchParams.get('period') || 'week'

  const now = new Date()
  let dateFrom: Date

  if (period === 'week') {
    dateFrom = new Date(now)
    dateFrom.setDate(dateFrom.getDate() - 7)
  } else if (period === 'month') {
    dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  } else {
    dateFrom = new Date(now.getFullYear(), 0, 1) // YTD
  }

  const { data: bookings } = await supabaseAdmin
    .from('bookings')
    .select('id, service_type, start_time, check_in_time, check_out_time, pay_rate, status')
    .eq('tenant_id', auth.tid)
    .eq('team_member_id', auth.id)
    .in('status', ['completed', 'paid'])
    .gte('start_time', dateFrom.toISOString())
    .order('start_time', { ascending: false })

  let totalHours = 0
  let totalEarnings = 0
  const jobs = (bookings || []).map((b) => {
    let hours = 0
    let pay = 0
    if (b.check_in_time && b.check_out_time) {
      hours = (new Date(b.check_out_time).getTime() - new Date(b.check_in_time).getTime()) / 3600000
      pay = hours * (b.pay_rate || 0)
    }
    totalHours += hours
    totalEarnings += pay
    return { ...b, hours: Math.round(hours * 100) / 100, pay: Math.round(pay * 100) / 100 }
  })

  return NextResponse.json({
    period,
    total_hours: Math.round(totalHours * 100) / 100,
    total_earnings: Math.round(totalEarnings * 100) / 100,
    jobs,
  })
}
