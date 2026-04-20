/**
 * Finance backfill — fill in `actual_hours`, `team_member_pay`, and `price`
 * for completed bookings missing those fields. Tenant-scoped.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

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
  team_members: { hourly_rate?: number | null } | null
}

export async function POST() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('id, start_time, end_time, team_member_id, hourly_rate, check_in_time, check_out_time, team_members(hourly_rate)')
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
      const clientRate = booking.hourly_rate ?? 75
      const teamPay = Math.round(hours * teamRate * 100)
      const clientPrice = Math.round(hours * clientRate * 100)

      await supabaseAdmin
        .from('bookings')
        .update({ actual_hours: hours, team_member_pay: teamPay, price: clientPrice })
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
