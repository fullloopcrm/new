import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'
import { notify } from '@/lib/notify'
import { sendEmail } from '@/lib/email'
import { escapeLikeValue } from '@/lib/postgrest-safe'
import { rateLimitDb } from '@/lib/rate-limit-db'

function generateRefCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 4).toUpperCase()
  const suffix = String(Math.floor(100 + Math.random() * 900))
  return prefix + suffix
}

function isValidName(name: string): boolean {
  if (name.length < 2 || name.length > 50) return false
  const alpha = name.replace(/[^a-zA-Z]/g, '')
  if (alpha.length < 2) return false
  const vowels = (alpha.match(/[aeiouAEIOU]/g) || []).length
  return vowels / alpha.length > 0.15
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const email = request.nextUrl.searchParams.get('email')

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  // failClosed: this resolves a code/email to a referrer's name+email+earnings
  // with no auth — same PII-enumeration-oracle shape as client/check, which is
  // already failClosed. An in-memory limiter also resets every serverless cold
  // start / per-instance, so it never actually bounded this in production —
  // moved to the persistent DB-backed limiter.
  const rl = await rateLimitDb(`referrer-lookup:${ip}`, 10, 10 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Scope every lookup to the tenant whose domain this request came in on.
  const lookupTenant = await getTenantFromHeaders()
  if (!lookupTenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  if (code) {
    // No auth on this branch (it exists to resolve a public referral code /
    // let a referrer look up their own code by email) -- never select
    // total_earned/total_paid/preferred_payout here. A referral code is
    // handed out publicly by design (it's the whole point of the share
    // link), so anyone who has ever seen one could otherwise pull the
    // referrer's earnings with zero auth. The real earnings dashboard is
    // gated behind the email-OTP session (see /api/referrers/[code] +
    // /api/referrers/auth/*) -- financial fields only live there.
    const { data } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, ref_code, created_at')
      .eq('tenant_id', lookupTenant.id)
      .eq('referral_code', code)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (email) {
    // Same no-financial-fields rule as the code branch above.
    const { data } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, ref_code, created_at')
      .eq('tenant_id', lookupTenant.id)
      .ilike('email', escapeLikeValue(email))
      .single()

    if (!data) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide code or email' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  // Signup is a public form (spam defense, not a PII oracle) — stays
  // fail-open like its siblings (contact, lead, apply), but persisted so it
  // survives cold starts instead of resetting per-instance.
  const rl = await rateLimitDb(`referrer-signup:${ip}`, 5, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const { name, email, phone, preferred_payout, zelle_email, apple_cash_phone, _t, recruited_by_sales_partner_ref } = body

  if (!name || !email) {
    return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
  }

  // Spam checks
  if (body.website || body.company) {
    return NextResponse.json({ error: 'Invalid submission' }, { status: 400 })
  }
  if (_t && Date.now() - _t < 3000) {
    return NextResponse.json({ error: 'Please try again' }, { status: 400 })
  }
  if (!isValidName(name)) {
    return NextResponse.json({ error: 'Please enter a valid name' }, { status: 400 })
  }

  // Resolve the tenant from the domain this signup came in on (signed
  // x-tenant-id header set by middleware) — NOT "the first active tenant".
  const tenant = await getTenantFromHeaders()
  if (!tenant) {
    return NextResponse.json({ error: 'Unknown business' }, { status: 400 })
  }

  const db = tenantDb(tenant.id)

  // Duplicate email — scoped to this tenant (same email may refer for two brands)
  const { data: existing } = await db
    .from('referrers')
    .select('id')
    .eq('tenant_id', tenant.id)
    .ilike('email', escapeLikeValue(email))
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  // referrers_code_unique constrains (tenant_id, referral_code)
  // (019_referral_commissions.sql). generateRefCode only has ~900 possible
  // suffixes per 4-letter name-prefix, so two referrers sharing a common
  // first-name prefix (e.g. "John"/"Joan" -> "JOHN"/"JOAN"... or shared
  // exact prefixes) collide far more often than a random UUID would.
  // Pre-fix this threw the raw 23505 as an unhandled 500 straight to a real
  // signup, same class already fixed for clients.pin/team_members.pin --
  // auto-generated codes are safe to retry with a freshly regenerated value.
  // A referrer recruited via a sales partner's "recruit a referrer" link
  // (?ref=<partner code> on /referral/signup) carries that attribution so
  // the partner earns a stacked override on this referrer's commissions.
  // Silently ignored if the code doesn't resolve to an active partner --
  // this is a best-effort attribution, not a hard requirement to sign up.
  let recruitedBySalesPartnerId: string | null = null
  if (recruited_by_sales_partner_ref) {
    const { data: recruiter } = await supabaseAdmin
      .from('sales_partners')
      .select('id')
      .eq('tenant_id', tenant.id)
      .eq('referral_code', String(recruited_by_sales_partner_ref).toUpperCase())
      .eq('active', true)
      .maybeSingle()
    recruitedBySalesPartnerId = recruiter?.id || null
  }

  const MAX_CODE_ATTEMPTS = 5
  let referralCode = generateRefCode(name)
  let data, error
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    ;({ data, error } = await db
      .from('referrers')
      .insert({
        name,
        email,
        phone: phone || null,
        referral_code: referralCode,
        // Every tenant's own /referral portal page (and the client/book referrer
        // lookup) key off this legacy nycmaid-parity column, not referral_code —
        // keep both in sync so new signups aren't invisible to those code paths.
        ref_code: referralCode,
        zelle_email: zelle_email || email,
        apple_cash_phone: apple_cash_phone || null,
        preferred_payout: preferred_payout || 'zelle',
        // Stored as a fraction (0.10 = 10%), matching the schema default and the
        // existing rows. The old code wrote `10` here (into the wrong table), which
        // would read as 1000% wherever commission_rate is applied to a gross amount.
        commission_rate: 0.10,
        total_earned: 0,
        total_paid: 0,
        status: 'active',
        recruited_by_sales_partner_id: recruitedBySalesPartnerId,
      })
      .select()
      .single())
    if (!error) break
    if (error.code !== '23505') break
    referralCode = generateRefCode(name)
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await notify({
    tenantId: tenant.id,
    type: 'new_lead',
    title: 'New Referrer Signup',
    message: `${name} (${referralCode}) — ${email}${phone ? ` · ${phone}` : ''}`,
  }).catch(() => {})

  // Referrers go active immediately on signup (no separate approval step, unlike
  // team members/sales partners) -- so signup IS the moment to auto-surface the
  // Connect invite, same "don't make them go hunting for it" requirement W1/W2
  // are wiring for their approval-gated lanes. Points at the normal email-OTP
  // login (/referral), not a direct dashboard link -- a long-lived bearer token
  // has no business sitting in an email inbox.
  const brand = tenant.name || 'Referral Portal'
  const color = tenant.primary_color || '#0d9488'
  const from = tenant.resend_domain ? `${brand} <noreply@${tenant.resend_domain}>` : undefined
  const loginUrl = `${tenantSiteUrl(tenant) || ''}/referral`
  const inviteHtml = `
    <div style="font-family:system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
      <h2 style="color:${color};margin:0 0 8px">Welcome to the ${brand} referral program!</h2>
      <p style="color:#475569;font-size:14px;margin:0 0 16px">Your referral code is <strong>${referralCode}</strong>. You'll earn a commission on every booking you refer.</p>
      <p style="color:#475569;font-size:14px;margin:0 0 20px">Want commissions sent straight to your bank instead of Zelle or Apple Cash? Log in and connect Stripe for instant pay.</p>
      <a href="${loginUrl}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;font-size:14px">Log In &amp; Set Up Instant Pay</a>
    </div>`

  sendEmail({
    to: email,
    subject: `Welcome to the ${brand} referral program`,
    html: inviteHtml,
    from,
    resendApiKey: tenant.resend_api_key || undefined,
  }).catch(() => {
    // Best-effort -- signup itself already succeeded (data returned below);
    // a failed welcome/invite email shouldn't fail the signup response.
  })

  return NextResponse.json({ referral: data }, { status: 201 })
}
