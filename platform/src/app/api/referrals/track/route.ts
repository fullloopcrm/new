import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST(request: Request) {
  // Anonymous, no RBAC gate by design (public referral-link click tracker) —
  // referral_code is a short 6-char Math.random() base36 code (see
  // /api/referrals POST), not a 192-bit token like every other public-token
  // route in this codebase, so without a rate limit a scripted loop could
  // brute-force-enumerate valid codes and harvest tenant id/name/slug per
  // code at unlimited request volume. Same bug class as the already-fixed
  // /api/feedback and /api/contact anonymous-POST routes.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`referrals-track:${ip}`, 20, 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please wait a while.' }, { status: 429 })
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
