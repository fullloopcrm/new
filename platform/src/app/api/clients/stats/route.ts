import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString()

    const [
      { count: totalClients },
      { count: activeClients },
      { count: newThisMonth },
      { data: revenueData },
      { data: sourceData },
    ] = await Promise.all([
      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).eq('status', 'active'),
      supabaseAdmin.from('clients').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', monthStart),
      supabaseAdmin.from('bookings').select('price, client_id').eq('tenant_id', tenantId).eq('payment_status', 'paid'),
      supabaseAdmin.from('clients').select('source').eq('tenant_id', tenantId),
    ])

    // Calculate total revenue and avg LTV
    const totalRevenue = (revenueData || []).reduce((sum, b) => sum + (b.price || 0), 0)
    const uniqueClients = new Set((revenueData || []).map(b => b.client_id)).size
    const avgLtv = uniqueClients > 0 ? Math.round(totalRevenue / uniqueClients) : 0

    // Count by source
    const sourceCounts: Record<string, number> = {}
    for (const c of sourceData || []) {
      const src = c.source || 'unknown'
      sourceCounts[src] = (sourceCounts[src] || 0) + 1
    }
    const referralCount = sourceCounts['referral'] || 0

    return NextResponse.json({
      total: totalClients || 0,
      active: activeClients || 0,
      newThisMonth: newThisMonth || 0,
      inactive: (totalClients || 0) - (activeClients || 0),
      referrals: referralCount,
      totalRevenue,
      avgLtv,
      sources: sourceCounts,
    })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    return NextResponse.json({ total: 0, active: 0, newThisMonth: 0, inactive: 0, referrals: 0, totalRevenue: 0, avgLtv: 0, sources: {} })
  }
}
