import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { tenantSiteUrl } from '@/lib/tenant-site'
import { getReferrerAuth } from '@/lib/referrer-portal-auth'

// Referrer earnings dashboard data. Gated: requires a referrer session token
// (from /api/referrers/auth/verify) whose referrer owns this code. Reads the
// real `referrers` table — the previous version read the unrelated, empty
// `referrals` table (client-referral edges), so every code 404'd.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params
  if (!code) return NextResponse.json({ error: 'Code required' }, { status: 400 })

  const auth = getReferrerAuth(request)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Load the authenticated referrer and confirm the URL code is theirs.
  const { data: referrer } = await supabaseAdmin
    .from('referrers')
    .select('id, tenant_id, name, email, referral_code, commission_rate, total_earned, total_paid, stripe_connect_account_id, stripe_ready_at')
    .eq('id', auth.rid)
    .single()

  if (!referrer || referrer.tenant_id !== auth.tid || referrer.referral_code !== code) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const db = tenantDb(referrer.tenant_id)

  // Tenant branding + public site base for the share link.
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('name, slug, domain, primary_color')
    .eq('id', referrer.tenant_id)
    .single()

  if (!tenant) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Resolve the tenant's public booking URL. Prefer the primary custom domain,
  // fall back to tenants.domain, then the slug host. The shared referral link is
  // this booking URL with ?ref=CODE — NOT the dashboard URL.
  // tenantDb's select() takes a non-literal `columns` param, which widens
  // supabase-js's column-string type inference — cast to the shape actually selected.
  const { data: domainRows } = (await db
    .from('tenant_domains')
    .select('domain, is_primary')
    .eq('active', true)) as { data: { domain: string; is_primary: boolean }[] | null }
  const primaryDomain = domainRows?.find((d) => d.is_primary)?.domain || tenant.domain || null
  const base = primaryDomain
    ? `https://${primaryDomain.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
    : tenantSiteUrl({ slug: tenant.slug })
  const shareUrl = base ? `${base}/book/new?ref=${code}` : null

  // Commission history — keyed by referrer_id. Amounts are stored in cents in
  // `commission_amount` (commission_cents is unreliable/double-scaled).
  let commissions: { id: string; client_name: string; amount: number; status: string; paid_via: string | null; created_at: string }[] = []
  try {
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const { data } = (await db
      .from('referral_commissions')
      .select('id, client_name, commission_amount, status, paid_via, created_at')
      .eq('referrer_id', referrer.id)
      .order('created_at', { ascending: false })
      .limit(50)) as { data: { id: string; client_name: string; commission_amount: number | null; status: string; paid_via: string | null; created_at: string }[] | null }
    commissions = (data || []).map((c) => ({
      id: c.id,
      client_name: c.client_name,
      amount: c.commission_amount || 0,
      status: c.status,
      paid_via: c.paid_via,
      created_at: c.created_at,
    }))
  } catch {
    commissions = []
  }

  // Booked-but-not-yet-completed jobs — not a commission yet (that only fires
  // on completion, see /api/team-portal/checkout), but real pipeline the
  // referrer should see instead of a silent gap where a freshly booked job
  // is invisible until the cleaning happens. Keyed off bookings.referrer_id,
  // the same snapshot commission creation uses.
  let pendingBookings: { id: string; start_time: string; status: string; client_name: string | null }[] = []
  try {
    const { data } = (await db
      .from('bookings')
      .select('id, start_time, status, clients(name)')
      .eq('referrer_id', referrer.id)
      .not('status', 'in', '(completed,cancelled)')
      .order('start_time', { ascending: true })) as { data: { id: string; start_time: string; status: string; clients: { name: string | null } | null }[] | null }
    pendingBookings = (data || []).map((b) => ({
      id: b.id,
      start_time: b.start_time,
      status: b.status,
      client_name: b.clients?.name || null,
    }))
  } catch {
    pendingBookings = []
  }

  // commission_rate is stored as a fraction (0.10); the UI shows a whole percent.
  const rawRate = Number(referrer.commission_rate) || 0
  const ratePercent = rawRate > 0 && rawRate <= 1 ? Math.round(rawRate * 100) : Math.round(rawRate)

  const converted = commissions.length

  return NextResponse.json({
    referrer: {
      id: referrer.id,
      name: referrer.name,
      email: referrer.email,
      referral_code: referrer.referral_code,
      commission_rate: ratePercent,
      total_earned: referrer.total_earned || 0,
      total_paid: referrer.total_paid || 0,
      stripe_connected: Boolean(referrer.stripe_connect_account_id),
      stripe_ready: Boolean(referrer.stripe_ready_at),
    },
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      primary_color: tenant.primary_color || '#0d9488',
    },
    share_url: shareUrl,
    stats: {
      total_clicks: 0,
      total_referrals: converted,
      total_converted: converted,
      total_earned: referrer.total_earned || 0,
      total_pending: (referrer.total_earned || 0) - (referrer.total_paid || 0),
    },
    commissions,
    pendingBookings,
  })
}
