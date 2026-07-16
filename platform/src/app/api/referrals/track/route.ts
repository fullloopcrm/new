import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'

export async function POST(request: Request) {
  // Unauthenticated code-lookup endpoint (bypasses RLS via supabaseAdmin) —
  // cap per-IP so a caller can't brute-force the referral_code space, matching
  // the same guard already on the sibling referrer-lookup endpoint
  // (referrers/route.ts GET, 10/10min, failClosed since this is a
  // code-guessing surface, not a public form).
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`referrals-track:${ip}`, 10, 10 * 60 * 1000, { failClosed: true })
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
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
