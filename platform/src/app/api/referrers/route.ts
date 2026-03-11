import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Rate limiting
const attempts = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(key: string, max = 10): boolean {
  const now = Date.now()
  const entry = attempts.get(key)
  if (entry && entry.resetAt > now) {
    if (entry.count >= max) return false
    entry.count++
    return true
  }
  attempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 })
  return true
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

  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`referrer-lookup:${ip}`)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  if (code) {
    const { data } = await supabaseAdmin
      .from('referrals')
      .select('id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at')
      .eq('referral_code', code)
      .single()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  if (email) {
    const { data } = await supabaseAdmin
      .from('referrals')
      .select('id, name, email, referral_code, total_earned, total_paid, preferred_payout, created_at')
      .ilike('email', email)
      .single()

    if (!data) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  return NextResponse.json({ error: 'Provide code or email' }, { status: 400 })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`referrer-signup:${ip}`, 5)) {
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

  // Check duplicate email
  const { data: existing } = await supabaseAdmin
    .from('referrals')
    .select('id')
    .ilike('email', email)
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
  }

  // We need a tenant_id — for now use the first active tenant
  // In a real multi-tenant setup, this would come from the URL/slug
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id')
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'No active business found' }, { status: 500 })
  }

  const referralCode = generateRefCode(name)

  const { data, error } = await supabaseAdmin
    .from('referrals')
    .insert({
      tenant_id: tenant.id,
      name,
      email,
      phone: phone || null,
      referral_code: referralCode,
      preferred_payout: preferred_payout || 'zelle',
      commission_rate: 10,
      total_earned: 0,
      total_paid: 0,
      total_clicks: 0,
      total_referrals: 0,
      total_converted: 0,
      total_pending: 0,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ referral: data }, { status: 201 })
}
