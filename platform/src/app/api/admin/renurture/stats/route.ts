import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { RENURTURE_TOUCHES, RENURTURE_IMMEDIATE_TOUCH } from '@/lib/renurture'

// Conversion/revenue tracking for the renurture win-back cron. A recipient
// "converted" if they have a non-cancelled booking created any time after
// they were sent a given touch — one qualifying booking per (touch, client)
// so a client who got both email+SMS for the same touch isn't double-counted.
// redeemed layers on top: of the clients who converted, how many did it by
// actually using their renurture_code (proven attribution) vs. rebooking
// some other way (still a real conversion, just not directly traceable).
function computeConversions(
  recipients: { touch_key: string; client_id: string; sent_at: string }[],
  bookings: { client_id: string; created_at: string; price: number | null }[],
): Record<string, { count: number; revenueCents: number }> {
  const result: Record<string, { count: number; revenueCents: number }> = {}
  const byTouch = new Map<string, { client_id: string; sent_at: string }[]>()
  for (const r of recipients) {
    if (!byTouch.has(r.touch_key)) byTouch.set(r.touch_key, [])
    byTouch.get(r.touch_key)!.push(r)
  }
  for (const [touchKey, recips] of byTouch) {
    const seenClients = new Set<string>()
    let count = 0
    let revenueCents = 0
    for (const r of recips) {
      if (seenClients.has(r.client_id)) continue
      const match = bookings.find(b => b.client_id === r.client_id && b.created_at >= r.sent_at)
      if (match) {
        seenClients.add(r.client_id)
        count++
        revenueCents += match.price || 0
      }
    }
    result[touchKey] = { count, revenueCents }
  }
  return result
}

export async function GET() {
  try {
    const { tenant: authTenant, error: authError } = await requirePermission('campaigns.view')
    if (authError) return authError
    const { tenantId } = authTenant

    const { data: log, error: logError } = await supabaseAdmin
      .from('renurture_log')
      .select('client_id, touch_key, segment, touch_num, discount_pct, sent_at, redeemed_at')
      .eq('tenant_id', tenantId)
      .limit(50000)

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 })
    }

    const rows = log || []
    if (rows.length === 0) {
      return NextResponse.json({ touches: [], totals: { sent: 0, converted: 0, redeemed: 0, revenueCents: 0 } })
    }

    const clientIds = Array.from(new Set(rows.map(r => r.client_id)))
    const earliestSent = rows.reduce((min: string | null, r) => (!min || r.sent_at < min ? r.sent_at : min), null)

    const { data: bookings } = earliestSent
      ? await supabaseAdmin
          .from('bookings')
          .select('client_id, created_at, price')
          .eq('tenant_id', tenantId)
          .in('client_id', clientIds)
          .gte('created_at', earliestSent)
          .neq('status', 'cancelled')
      : { data: [] }

    const conversions = computeConversions(
      rows.map(r => ({ touch_key: r.touch_key, client_id: r.client_id, sent_at: r.sent_at })),
      bookings || [],
    )

    const allTouches = [RENURTURE_IMMEDIATE_TOUCH, ...RENURTURE_TOUCHES]
    const touches = allTouches.map(t => {
      const touchRows = rows.filter(r => r.touch_key === t.key)
      const redeemed = touchRows.filter(r => r.redeemed_at).length
      const conv = conversions[t.key] || { count: 0, revenueCents: 0 }
      return {
        key: t.key,
        label: t.label,
        segment: t.segment,
        touchNum: t.touchNum,
        discountPct: t.discountPct,
        sent: touchRows.length,
        converted: conv.count,
        redeemed,
        revenueCents: conv.revenueCents,
      }
    })

    const totals = touches.reduce(
      (acc, t) => ({
        sent: acc.sent + t.sent,
        converted: acc.converted + t.converted,
        redeemed: acc.redeemed + t.redeemed,
        revenueCents: acc.revenueCents + t.revenueCents,
      }),
      { sent: 0, converted: 0, redeemed: 0, revenueCents: 0 },
    )

    return NextResponse.json({ touches: touches.filter(t => t.sent > 0), totals })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('[renurture stats] error:', err)
    return NextResponse.json({ error: 'Failed to load renurture stats' }, { status: 500 })
  }
}
