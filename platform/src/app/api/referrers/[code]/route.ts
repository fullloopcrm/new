import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
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
  // maybeSingle()+explicit error check (not single() with error discarded):
  // a genuine DB failure here used to look identical to "no such referrer"
  // and fall through to the same 403 Forbidden a real cross-tenant/forged
  // token gets, masking a server-side outage as an auth rejection.
  const { data: referrer, error: referrerError } = await supabaseAdmin
    .from('referrers')
    .select('id, tenant_id, name, email, referral_code, commission_rate, total_earned, total_paid')
    .eq('id', auth.rid)
    .maybeSingle()

  if (referrerError) {
    console.error(`REFERRER_PORTAL_LOOKUP_ERROR id=${auth.rid} error=${referrerError.message}`)
    return NextResponse.json({ error: 'Could not load referrer account. Please try again.' }, { status: 500 })
  }

  if (!referrer || referrer.tenant_id !== auth.tid || referrer.referral_code !== code) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Tenant branding + public site base for the share link. Same
  // maybeSingle()+explicit error check — a DB failure here used to look
  // identical to "tenant deleted" (404) instead of a server error (500).
  const { data: tenant, error: tenantError } = await supabaseAdmin
    .from('tenants')
    .select('name, slug, domain, primary_color, email, owner_email')
    .eq('id', referrer.tenant_id)
    .maybeSingle()

  if (tenantError) {
    console.error(`REFERRER_PORTAL_TENANT_LOOKUP_ERROR tenant_id=${referrer.tenant_id} error=${tenantError.message}`)
    return NextResponse.json({ error: 'Could not load business. Please try again.' }, { status: 500 })
  }

  if (!tenant) return NextResponse.json({ error: 'Business not found' }, { status: 404 })

  // Resolve the tenant's public booking URL. tenantSiteUrl() already encodes
  // this exact precedence (tenant_domains PRIMARY via getPrimaryTenantDomain's
  // deterministic created_at ordering, tenants.domain FALLBACK, slug host
  // LAST) — this route used to hand-roll its own unordered
  // `.find(d => d.is_primary)` over tenant_domains, reintroducing the
  // non-deterministic-primary bug getPrimaryTenantDomain was hardened
  // against. The shared referral link is this booking URL with ?ref=CODE —
  // NOT the dashboard URL.
  const base = await tenantSiteUrl({ id: referrer.tenant_id, domain: tenant.domain, slug: tenant.slug })
  const shareUrl = base ? `${base}/book/new?ref=${code}` : null

  // Commission history — keyed by referrer_id. Amounts are stored in cents in
  // `commission_amount` (commission_cents is unreliable/double-scaled).
  let commissions: { id: string; client_name: string; amount: number; status: string; paid_via: string | null; created_at: string }[] = []
  try {
    const { data } = await supabaseAdmin
      .from('referral_commissions')
      .select('id, client_name, commission_amount, status, paid_via, created_at')
      .eq('referrer_id', referrer.id)
      .order('created_at', { ascending: false })
      .limit(50)
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
    },
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      primary_color: tenant.primary_color || '#0d9488',
      // Same precedence as the shared template's contact.email
      // (site/template/_config/load.ts) — the referrer portal is the one
      // other surface that shows a tenant support contact to the public.
      email: tenant.email || tenant.owner_email || null,
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
  })
}
