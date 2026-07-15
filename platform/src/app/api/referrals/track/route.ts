import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

// Public, unauthenticated — takes an arbitrary referral_code and does a DB
// lookup with no throttling, same enumeration/abuse class already fixed on
// the sibling public forms (inquiry, feedback, leads).
export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limit = await rateLimitDb(`referrals-track:${ip}`, 20, 10 * 60 * 1000)
  if (!limit.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes.' }, { status: 429 })
  }

  const { referral_code } = await request.json().catch(() => ({}))

  if (!referral_code) {
    return NextResponse.json({ error: 'referral_code required' }, { status: 400 })
  }

  // Look up referral
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id, tenant_id')
    .eq('referral_code', referral_code)
    .single()

  if (!referral) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 404 })
  }

  // Record click (increment or track — for now just return tenant info)
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug')
    .eq('id', referral.tenant_id)
    .single()

  return NextResponse.json({ tenant, referral_id: referral.id })
}
