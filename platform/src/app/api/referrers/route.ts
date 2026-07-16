import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Escape LIKE/ILIKE wildcards so `email` is matched literally (Postgres default
// LIKE escape char is backslash). GET is unauthenticated and public -- without
// this, a caller with no prior knowledge of any referrer could use '%'/'_' to
// turn a single-address lookup into a probe/enumeration primitive that leaks
// another referrer's name/earnings/payout prefs. Same pattern as
// client/check/route.ts's escapeLike.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

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

  // DB-backed (not in-memory) so the cap survives serverless cold starts and
  // holds across concurrent instances — see rate-limit-db.ts.
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { allowed: lookupAllowed } = await rateLimitDb(`referrer-lookup:${ip}`, 10, 10 * 60 * 1000)
  if (!lookupAllowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Scope every lookup to the tenant whose domain this request came in on.
  const lookupTenant = await getTenantFromHeaders()
  if (!lookupTenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

  const lookupDb = tenantDb(lookupTenant.id)

  if (code) {
    const { data } = await lookupDb
      .from('referrers')
      .select('id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at')
      .eq('referral_code', code)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (email) {
    const { data } = await lookupDb
      .from('referrers')
      .select('id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at')
      .ilike('email', escapeLike(email))
      .single()

    if (!data) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide code or email' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  // DB-backed (not in-memory) so the cap survives serverless cold starts and
  // holds across concurrent instances — see rate-limit-db.ts.
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  const { allowed: signupAllowed } = await rateLimitDb(`referrer-signup:${ip}`, 5, 10 * 60 * 1000)
  if (!signupAllowed) {
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

  const db = tenantDb(tenant.id)

  // Duplicate email — scoped to this tenant (same email may refer for two brands)
  const { data: existing } = await db
    .from('referrers')
    .select('id')
    .ilike('email', escapeLike(email))
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  const referralCode = generateRefCode(name)

  const { data, error } = await db
    .from('referrers')
    .insert({
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
