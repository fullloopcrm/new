/**
 * Finance backfill — fill in `actual_hours`, `team_member_pay`, and `price`
 * for completed bookings missing those fields. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

// Round to half-hour with 10-min grace: 3:09 → 3.0, 3:10 → 3.5.
const roundToHalfHour = (hours: number) => {
  const totalMinutes = hours * 60
  const halfHours = Math.floor(totalMinutes / 30)
  const remainder = totalMinutes - halfHours * 30
  return remainder >= 10 ? (halfHours + 1) * 0.5 : halfHours * 0.5
}

interface BookingRow {
  id: string
  start_time: string
  end_time: string
  hourly_rate: number | null
  check_in_time: string | null
  check_out_time: string | null
  actual_hours: number | null
  price: number | null
  team_members: { hourly_rate?: number | null } | null
}

export async function POST() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.expenses')
    if (_authError) return _authError
    const { tenantId } = _authTenant

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, team_member_id, hourly_rate, check_in_time, check_out_time, actual_hours, price, team_members!bookings_team_member_id_fkey(hourly_rate)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .is('team_member_pay', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let updated = 0
    for (const booking of (bookings as unknown as BookingRow[] | null) || []) {
      let hours: number
      if (booking.check_in_time && booking.check_out_time) {
        const ci = booking.check_in_time.endsWith('Z') ? booking.check_in_time : booking.check_in_time + 'Z'
        const co = booking.check_out_time.endsWith('Z') ? booking.check_out_time : booking.check_out_time + 'Z'
        hours = roundToHalfHour((new Date(co).getTime() - new Date(ci).getTime()) / 3_600_000)
      } else {
        hours = roundToHalfHour((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 3_600_000)
      }

      const teamRate = booking.team_members?.hourly_rate ?? 25
      const teamPay = Math.round(hours * teamRate * 100)

      // Only fill fields that are actually missing. `price` in particular is
      // set at booking creation from the quote/flat-fee total (sale-to-booking.ts,
      // client/book) for nearly every booking, and post-revenue.ts posts ledger
      // entries straight off it — overwriting an already-set price with an
      // hourly-formula estimate here would silently diverge the booking from
      // what was actually quoted, invoiced, and posted.
      const updates: Record<string, number> = { team_member_pay: teamPay }
      if (booking.actual_hours == null) updates.actual_hours = hours
      if (booking.price == null) updates.price = Math.round(hours * (booking.hourly_rate ?? 75) * 100)

      await supabaseAdmin
        .from('bookings')
        .update(updates)
        .eq('id', booking.id)
        .eq('tenant_id', tenantId)

      updated++
    }

    return NextResponse.json({ success: true, updated })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('finance/backfill error:', err)
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 })
  }
}
