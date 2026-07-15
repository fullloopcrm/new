import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
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

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const email = request.nextUrl.searchParams.get('email')

  // Admin-only: this used to be an unauthenticated code/email -> name+email+
  // earnings+payout-method lookup (rate-limited, but still a public oracle —
  // referral codes are shareable/guessable and emails are often public). The
  // referrer-facing dashboard was migrated off this to the Bearer-token-gated
  // GET /api/referrers/[code] (see src/lib/referrer-portal-auth.ts); nothing
  // in-repo calls this code/email lookup unauthenticated anymore, so require
  // an admin session rather than leaving the disclosure live for anyone else.
  const authError = await requireAdmin()
  if (authError) return authError

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const rl = await rateLimitDb(`referrer-lookup:${ip}`, 10, 10 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Scope every lookup to the tenant whose domain this request came in on.
  const lookupTenant = await getTenantFromHeaders()
  if (!lookupTenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  if (code) {
    const { data } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at')
      .eq('tenant_id', lookupTenant.id)
      .eq('referral_code', code)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (email) {
    const { data } = await supabaseAdmin
      .from('referrers')
      .select('id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at')
      .eq('tenant_id', lookupTenant.id)
      .ilike('email', email)
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
    .ilike('email', email)
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

  return NextResponse.json({ referral: data }, { status: 201 })
}
