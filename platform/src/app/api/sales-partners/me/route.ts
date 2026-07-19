/**
 * Sales Partner's own portal dashboard data. Gated by the signed session
 * token from POST /api/sales-partners/login. Mirrors the referrer earnings
 * dashboard (src/app/api/referrers/[code]/route.ts) — share link, commission
 * history, recruited-referrer network (the partner-specific addition).
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { getSalesPartnerAuth } from '@/lib/sales-partner-portal-auth'
import { getSettings } from '@/lib/settings'
import { buildSalesKnowledgeBase } from '@/lib/knowledge-base'
import { autoPromoteSalesPartnerTier, computeTierProgress } from '@/lib/sales-partner-tier'

export async function GET(request: Request) {
  const auth = getSalesPartnerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Self-heal on every load: promote tier/commission_rate if the partner's
  // direct-client count has crossed a threshold since the last check (also
  // triggered live at checkout — see team-portal/checkout/route.ts).
  const promotion = await autoPromoteSalesPartnerTier(auth.tid, auth.pid).catch((err) => {
    console.error(`[sales-partners/me] auto-promote failed: ${err instanceof Error ? err.message : err}`)
    return null
  })

  const { data: partner, error: partnerError } = await supabaseAdmin
    .from('sales_partners')
    .select('id, tenant_id, name, email, referral_code, tier, commission_rate, total_earned, total_paid, preferred_payout, zelle_email, zelle_phone, apple_cash_phone')
    .eq('id', auth.pid)
    .maybeSingle()

  if (partnerError) {
    console.error(`SALES_PARTNER_PORTAL_LOOKUP_ERROR id=${auth.pid} error=${partnerError.message}`)
    return NextResponse.json({ error: 'Could not load partner account. Please try again.' }, { status: 500 })
  }
  if (!partner || partner.tenant_id !== auth.tid) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('name, slug, domain, primary_color')
    .eq('id', partner.tenant_id)
    .maybeSingle()
  if (tenantError) {
    console.error(`SALES_PARTNER_PORTAL_TENANT_LOOKUP_ERROR tenant_id=${partner.tenant_id} error=${tenantError.message}`)
    return NextResponse.json({ error: 'Could not load business. Please try again.' }, { status: 500 })
  }
  if (!tenant) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  const { data: domainRows } = await supabaseAdmin
    .from('tenant_domains')
    .select('domain, is_primary')
    .eq('tenant_id', partner.tenant_id)
    .eq('active', true)
  const primaryDomain = domainRows?.find((d) => d.is_primary)?.domain || tenant.domain || null
  const base = primaryDomain
    ? `https://${primaryDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
    : tenantSiteUrl({ slug: tenant.slug })
  const shareUrl = base ? `${base}/book/new?ref=${partner.referral_code}` : null
  const referrerSignupUrl = base ? `${base}/referral/signup?ref=${partner.referral_code}` : null

  const { data: commissionRows } = await supabaseAdmin
    .from('sales_partner_commissions')
    .select('id, source, client_name, commission_cents, status, paid_via, created_at')
    .eq('sales_partner_id', partner.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: recruited } = await supabaseAdmin
    .from('referrers')
    .select('id, name, referral_code, total_earned, status')
    .eq('recruited_by_sales_partner_id', partner.id)

  // Click tracking — reuses lead_clicks (already keyed by generic ref_code,
  // populated by every site's /api/track beacon), same as referrer analytics
  // (src/app/api/referrers/analytics/route.ts). Not FK'd to sales_partners,
  // so this data was already being captured, just never surfaced here.
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const { data: clickRows } = await supabaseAdmin
    .from('lead_clicks')
    .select('action, session_id, lead_id, created_at')
    .eq('tenant_id', partner.tenant_id)
    .eq('ref_code', partner.referral_code)
    .order('created_at', { ascending: false })
    .limit(2000)
  const clicks = clickRows || []
  const linkStats = {
    clicks: clicks.length,
    uniqueVisitors: new Set(clicks.map((c) => c.session_id || c.lead_id).filter(Boolean)).size,
    bookClicks: clicks.filter((c) => c.action === 'book').length,
    thisWeek: clicks.filter((c) => new Date((c.created_at || '') + 'Z') >= weekAgo).length,
  }

  let directClientCount = promotion?.directClientCount ?? null
  if (directClientCount == null) {
    const { count } = await supabaseAdmin
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', partner.tenant_id)
      .eq('sales_partner_id', partner.id)
    directClientCount = count || 0
  }

  // Completed cleanings = every direct-source commission this partner has
  // ever earned (a commission is only created at checkout on an actually
  // completed booking — see createPartnerCommission in team-portal/checkout).
  const completedCleanings = (commissionRows || []).filter((c) => c.source === 'direct').length

  const settings = await getSettings(partner.tenant_id)
  const tierProgress = computeTierProgress(partner.tier as string, directClientCount)
  const knowledgeBase = buildSalesKnowledgeBase(settings, tierProgress)

  const rawRate = Number(partner.commission_rate) || 0
  const ratePercent = rawRate > 0 && rawRate <= 1 ? Math.round(rawRate * 100) : Math.round(rawRate)

  return NextResponse.json({
    partner: {
      id: partner.id,
      name: partner.name,
      email: partner.email,
      referral_code: partner.referral_code,
      tier: partner.tier,
      commission_rate: ratePercent,
      total_earned: partner.total_earned || 0,
      total_paid: partner.total_paid || 0,
      preferred_payout: partner.preferred_payout,
      zelle_email: partner.zelle_email,
      zelle_phone: partner.zelle_phone,
      apple_cash_phone: partner.apple_cash_phone,
    },
    tier_progress: {
      tier: tierProgress.current.key,
      label: tierProgress.current.label,
      rate_percent: Math.round(tierProgress.current.rate * 100),
      direct_client_count: directClientCount,
      next_tier: tierProgress.next ? { label: tierProgress.next.label, rate_percent: Math.round(tierProgress.next.rate * 100), threshold: tierProgress.next.threshold } : null,
      remaining_to_next: tierProgress.remainingToNext,
      progress_pct: tierProgress.progressPct,
      just_promoted: promotion?.promoted || false,
    },
    link_stats: linkStats,
    funnel: {
      clicks: linkStats.clicks,
      direct_clients: directClientCount,
      completed_cleanings: completedCleanings,
    },
    knowledge_base: knowledgeBase,
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      primary_color: tenant.primary_color || '#0d9488',
    },
    share_url: shareUrl,
    referrer_signup_url: referrerSignupUrl,
    stats: {
      total_earned: partner.total_earned || 0,
      total_pending: (partner.total_earned || 0) - (partner.total_paid || 0),
      recruited_referrer_count: (recruited || []).length,
    },
    commissions: (commissionRows || []).map((c) => ({
      id: c.id,
      source: c.source,
      client_name: c.client_name,
      amount: c.commission_cents || 0,
      status: c.status,
      paid_via: c.paid_via,
      created_at: c.created_at,
    })),
    recruited_referrers: recruited || [],
  })
}

export async function PUT(request: Request) {
  // Self-service profile update: payout method + contact fields only.
  // Deliberately excludes active/tier/commission_rate, which stay admin-only
  // (see PUT /api/sales-partners) -- mirrors the referrer profile endpoint's
  // same split.
  const auth = getSalesPartnerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const allowed = ['preferred_payout', 'zelle_email', 'zelle_phone', 'apple_cash_phone'] as const
  const updates: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('sales_partners')
    .update(updates)
    .eq('id', auth.pid)
    .eq('tenant_id', auth.tid)
    .select('id, preferred_payout, zelle_email, zelle_phone, apple_cash_phone')
    .maybeSingle()

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(data)
}
