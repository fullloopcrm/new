import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('bookings.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant

    // bookings.start_time/payment_date are stored naive-ET (no tz, literally
    // what was typed in). `now.toISOString()` is a true-UTC reading, and the
    // old `new Date().getFullYear()/getMonth()/getDate()` calls read the
    // SERVER's local calendar (UTC on Vercel) -- both run a full day/hours
    // ahead of ET for ~4-5h every evening, silently dropping tonight's jobs
    // from "this week" and misplacing the month boundary. Format "now" as a
    // naive ET wall-clock string, and compute month/week edges off the ET
    // calendar day so they match what's actually stored.
    const pad = (n: number) => String(n).padStart(2, '0')
    const now = new Date()
    const nowET = now.toLocaleString('sv-SE', { timeZone: 'America/New_York' }).replace(' ', 'T')
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const [ty, tm, td] = todayStr.split('-').map(Number)
    const monthStartObj = new Date(Date.UTC(ty, tm - 1, 1))
    const monthStart = `${monthStartObj.getUTCFullYear()}-${pad(monthStartObj.getUTCMonth() + 1)}-${pad(monthStartObj.getUTCDate())}T00:00:00`
    const weekEndObj = new Date(Date.UTC(ty, tm - 1, td + 7))
    const weekEnd = `${weekEndObj.getUTCFullYear()}-${pad(weekEndObj.getUTCMonth() + 1)}-${pad(weekEndObj.getUTCDate())}T00:00:00`

    const [
      { count: upcoming },
      { count: thisWeek },
      { count: completed },
      { data: paidBookings },
    ] = await Promise.all([
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).in('status', ['scheduled', 'confirmed']),
      supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId).gte('start_time', nowET).lt('start_time', weekEnd),
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
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ upcoming: 0, thisWeek: 0, completed: 0, revenue: 0 })
  }
}
