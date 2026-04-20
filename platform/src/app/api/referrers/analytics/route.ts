/**
 * Referrer analytics — referral traffic overview, top referrers, recent activity.
 * Tenant-scoped. Ported from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

interface LeadClick {
  ref_code: string | null
  action: string | null
  session_id: string | null
  lead_id: string | null
  device: string | null
  page: string | null
  created_at: string
}

interface ReferredBooking {
  id: string
  status: string
  price: number | null
  referrer_id: string | null
}

interface Referrer {
  id: string
  name: string | null
  referral_code: string | null
  total_earned: number | null
}

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { data: allSiteClicks } = await supabaseAdmin
      .from('lead_clicks')
      .select('ref_code, action, session_id, lead_id, device, page, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    const siteClicks = (allSiteClicks as LeadClick[] | null) || []
    const refClicks = siteClicks.filter(c => c.ref_code)
    const refWeekClicks = refClicks.filter(c => new Date((c.created_at || '') + 'Z') >= weekAgo)
    const refUniqueVisitors = new Set(refClicks.map(c => c.session_id || c.lead_id).filter(Boolean)).size
    const refBookClicks = refClicks.filter(c => c.action === 'book').length
    const refCallClicks = refClicks.filter(c => c.action === 'call').length

    const { data: referredBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status, price, referrer_id')
      .eq('tenant_id', tenantId)
      .not('referrer_id', 'is', null)

    const allReferred = (referredBookings as ReferredBooking[] | null) || []
    const completedReferred = allReferred.filter(b => b.status === 'completed')
    const allReferredRevenue = allReferred.reduce((s, b) => s + (b.price || 0), 0)

    const refClickCounts: Record<string, { ref_code: string; clicks: number; bookClicks: number }> = {}
    for (const click of refClicks) {
      const code = click.ref_code!
      if (!refClickCounts[code]) refClickCounts[code] = { ref_code: code, clicks: 0, bookClicks: 0 }
      refClickCounts[code].clicks++
      if (click.action === 'book') refClickCounts[code].bookClicks++
    }

    const { data: referrers } = await supabaseAdmin
      .from('referrers')
      .select('id, name, referral_code, total_earned')
      .eq('tenant_id', tenantId)

    const refMap: Record<string, { id: string; name: string; total_earned: number }> = {}
    for (const r of (referrers as Referrer[] | null) || []) {
      if (r.referral_code) {
        refMap[r.referral_code] = { id: r.id, name: r.name || r.referral_code, total_earned: r.total_earned || 0 }
      }
    }

    const topReferrers = Object.values(refClickCounts)
      .map(r => ({
        name: refMap[r.ref_code]?.name || r.ref_code,
        ref_code: r.ref_code,
        clicks: r.clicks,
        bookClicks: r.bookClicks,
        bookings: allReferred.filter(b => b.referrer_id === refMap[r.ref_code]?.id).length,
        earned: refMap[r.ref_code]?.total_earned || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10)

    const refActivity = refClicks.slice(0, 20)
    const recentActivity = (refActivity.length > 0 ? refActivity : siteClicks.slice(0, 20)).map(c => ({
      ref_code: c.ref_code || 'direct',
      action: c.action,
      device: c.device || 'unknown',
      page: c.page || '/',
      time: c.created_at,
    }))

    const dailyClicks: { date: string; clicks: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = d.toISOString().split('T')[0]
      const count = refClicks.filter(c => (c.created_at || '').startsWith(dateStr)).length
      dailyClicks.push({ date: dateStr, clicks: count })
    }

    return NextResponse.json({
      overview: {
        totalClicks: refClicks.length,
        weekClicks: refWeekClicks.length,
        monthClicks: refClicks.length,
        bookClicks: refBookClicks,
        callClicks: refCallClicks,
        uniqueVisitors: refUniqueVisitors,
        totalReferredBookings: allReferred.length,
        completedReferredBookings: completedReferred.length,
        referredRevenue: allReferredRevenue,
        conversionRate: refUniqueVisitors > 0 ? ((allReferred.length / refUniqueVisitors) * 100).toFixed(1) : '0',
        totalSiteClicks: siteClicks.length,
      },
      topReferrers,
      recentActivity,
      dailyClicks,
    })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Referrer analytics error:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
