import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { getSettings } from '@/lib/settings'

/**
 * GET /api/clients/analytics
 * Returns LTV per client and tenant-wide lifecycle metrics.
 * Lifecycle is computed against tenant-configured thresholds:
 *   active: last booking within active_client_threshold_days
 *   at_risk: within at_risk_threshold_days but not active
 *   churned: beyond at_risk_threshold_days
 */
export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const settings = await getSettings(tenantId)
    const dayMs = 24 * 60 * 60 * 1000
    const activeCutoff = new Date(Date.now() - settings.active_client_threshold_days * dayMs).toISOString()
    const atRiskCutoff = new Date(Date.now() - settings.at_risk_threshold_days * dayMs).toISOString()

    const { data: bookings, error } = await supabaseAdmin
      .from('bookings')
      .select('client_id, price, start_time, status, clients(name)')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .order('start_time', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    type Lifecycle = 'active' | 'at_risk' | 'churned'
    function classify(lastBooking: string | null): Lifecycle {
      if (!lastBooking) return 'churned'
      if (lastBooking >= activeCutoff) return 'active'
      if (lastBooking >= atRiskCutoff) return 'at_risk'
      return 'churned'
    }

    type ClientStat = {
      client_id: string
      name: string
      ltv: number
      bookings: number
      lastBooking: string | null
      lifecycle: Lifecycle
      churned: boolean
    }
    const map = new Map<string, ClientStat>()

    for (const b of bookings || []) {
      const cid = b.client_id as string | null
      if (!cid) continue
      const existing = map.get(cid)
      const clientName = (b.clients as unknown as { name?: string } | null)?.name || 'Unknown'
      if (!existing) {
        const lifecycle = classify(b.start_time as string)
        map.set(cid, {
          client_id: cid,
          name: clientName,
          ltv: b.price || 0,
          bookings: 1,
          lastBooking: b.start_time,
          lifecycle,
          churned: lifecycle === 'churned',
        })
      } else {
        existing.ltv += b.price || 0
        existing.bookings += 1
        if (!existing.lastBooking || (b.start_time as string) > existing.lastBooking) {
          existing.lastBooking = b.start_time
          existing.lifecycle = classify(b.start_time as string)
          existing.churned = existing.lifecycle === 'churned'
        }
      }
    }

    const clients = Array.from(map.values()).sort((a, b) => b.ltv - a.ltv)
    const totalClients = clients.length
    const activeClients = clients.filter(c => c.lifecycle === 'active').length
    const atRiskClients = clients.filter(c => c.lifecycle === 'at_risk').length
    const churnedClients = clients.filter(c => c.lifecycle === 'churned').length
    const churnRate = totalClients > 0 ? (churnedClients / totalClients) * 100 : 0
    const totalLtv = clients.reduce((s, c) => s + c.ltv, 0)
    const avgLtv = totalClients > 0 ? totalLtv / totalClients : 0

    return NextResponse.json({
      clients: clients.slice(0, 200),
      summary: {
        totalClients,
        activeClients,
        atRiskClients,
        churnedClients,
        churnRate: Math.round(churnRate * 10) / 10,
        totalLtv,
        avgLtv: Math.round(avgLtv),
      },
      thresholds: {
        active_days: settings.active_client_threshold_days,
        at_risk_days: settings.at_risk_threshold_days,
      },
    })
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status })
    throw e
  }
}
