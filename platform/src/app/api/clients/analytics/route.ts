import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

/**
 * GET /api/clients/analytics
 * Returns LTV per client and tenant-wide churn metrics.
 * - LTV: sum of completed booking prices grouped by client
 * - Churn: clients whose last completed booking was > 90 days ago
 */
export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('client_id, price, start_time, status, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type ClientStat = {
      client_id: string
      name: string
      ltv: number
      bookings: number
      lastBooking: string | null
      churned: boolean
    }
    const map = new Map<string, ClientStat>()

    for (const b of bookings || []) {
      const cid = b.client_id as string | null
      if (!cid) continue
      const existing = map.get(cid)
      const clientName = (b.clients as unknown as { name?: string } | null)?.name || 'Unknown'
      if (!existing) {
        map.set(cid, {
          client_id: cid,
          name: clientName,
          ltv: b.price || 0,
          bookings: 1,
          lastBooking: b.start_time,
          churned: (b.start_time as string) < ninetyDaysAgo,
        })
      } else {
        existing.ltv += b.price || 0
        existing.bookings += 1
        if (!existing.lastBooking || (b.start_time as string) > existing.lastBooking) {
          existing.lastBooking = b.start_time
          existing.churned = (b.start_time as string) < ninetyDaysAgo
        }
      }
    }

    const clients = Array.from(map.values()).sort((a, b) => b.ltv - a.ltv)
    const totalClients = clients.length
    const churnedClients = clients.filter(c => c.churned).length
    const churnRate = totalClients > 0 ? (churnedClients / totalClients) * 100 : 0
    const totalLtv = clients.reduce((s, c) => s + c.ltv, 0)
    const avgLtv = totalClients > 0 ? totalLtv / totalClients : 0

    return NextResponse.json({
      clients: clients.slice(0, 200),
      summary: {
        totalClients,
        churnedClients,
        churnRate: Math.round(churnRate * 10) / 10,
        totalLtv,
        avgLtv: Math.round(avgLtv),
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
