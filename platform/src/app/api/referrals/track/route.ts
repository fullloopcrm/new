import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
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
