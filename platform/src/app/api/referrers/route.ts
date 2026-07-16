import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { requireAdmin } from '@/lib/require-admin'

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

// Escape LIKE/ILIKE wildcards so the lookup only ever matches the literal
// address (Postgres default LIKE escape char is backslash) — this endpoint
// is unauthenticated, so an unescaped '%'/'_' in `email` lets a caller with
// no prior knowledge enumerate every referrer's email/earnings/payout info
// for the tenant instead of confirming a single known address. Same pattern
// as lib/inbound-email-tenant.ts's escapeLike().
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const email = request.nextUrl.searchParams.get('email')

  // Admin-only: this used to be an unauthenticated code/email -> name+email+
  // earnings+payout-method lookup (rate-limited, but still a public oracle —
  // referral codes are shareable/guessable and emails are often public). The
  // referrer-facing dashboard reads its own data via the Bearer-token-gated
  // GET /api/referrers/[code] (src/lib/referrer-portal-auth.ts) instead, so
  // nothing legitimate needs this code/email lookup unauthenticated.
  const authError = await requireAdmin()
  if (authError) return authError

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const lookupRl = await rateLimitDb(`referrer-lookup:${ip}`, 10, 10 * 60 * 1000, { failClosed: true })
  if (!lookupRl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Scope every lookup to the tenant whose domain this request came in on.
  const lookupTenant = await getTenantFromHeaders()
  if (!lookupTenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  if (code) {
    const { data } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, ref_code, total_earned, total_paid, preferred_payout, created_at')
      .eq('tenant_id', lookupTenant.id)
      .eq('referral_code', code)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (email) {
    const { data } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, ref_code, total_earned, total_paid, preferred_payout, created_at')
      .eq('tenant_id', lookupTenant.id)
      .ilike('email', escapeLike(email))
      .single()

    if (!data) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide code or email' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const signupRl = await rateLimitDb(`referrer-signup:${ip}`, 5, 10 * 60 * 1000)
  if (!signupRl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await request.json()
  const { name, email, phone, preferred_payout, zelle_email, apple_cash_phone, _t } = body

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

  // Duplicate email — scoped to this tenant (same email may refer for two brands)
  const { data: existing } = await supabaseAdmin
    .from('referrers')
    .select('id')
    .eq('tenant_id', tenant.id)
    .ilike('email', escapeLike(email))
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  const referralCode = generateRefCode(name)

  const { data, error } = await supabaseAdmin
    .from('referrers')
    .insert({
      tenant_id: tenant.id,
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
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await notify({
    tenantId: tenant.id,
    type: 'new_lead',
    title: 'New Referrer Signup',
    message: `${name} (${referralCode}) — ${email}${phone ? ` · ${phone}` : ''}`,
  }).catch(() => {})

  return NextResponse.json({ referral: data }, { status: 201 })
}
