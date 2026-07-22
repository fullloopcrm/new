import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { tenantDb } from '@/lib/tenant-db'

// GET — fetch jobs needing close-out + recently closed
export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const db = tenantDb(tenantId)

    // Jobs needing close-out: completed/in_progress but not fully closed
    // "Fully closed" = payment_status is paid AND team_member_paid is true
    const { data: needsCloseout } = await db
      .from('bookings')
      .select('id, service_type, start_time, end_time, status, price, hourly_rate, pay_rate, actual_hours, team_member_pay, payment_status, payment_method, team_member_paid, discount_enabled, check_in_time, check_out_time, clients(name, phone, address), team_members!bookings_team_member_id_fkey(name)')
      .in('status', ['completed', 'in_progress', 'paid'])
      .or('payment_status.neq.paid,team_member_paid.is.null,team_member_paid.eq.false')
      .order('start_time', { ascending: false })
      .limit(50)

    // Recently closed (last 7 days) — fully paid + team paid
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { data: recentlyClosed } = await db
      .from('bookings')
      .select('id, service_type, start_time, price, payment_method, team_member_pay, clients(name), team_members!bookings_team_member_id_fkey(name)')
      .eq('payment_status', 'paid')
      .eq('team_member_paid', true)
      .gte('check_out_time', sevenDaysAgo)
      .order('check_out_time', { ascending: false })
      .limit(20)

    return NextResponse.json({
      needsCloseout: needsCloseout || [],
      recentlyClosed: recentlyClosed || [],
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
