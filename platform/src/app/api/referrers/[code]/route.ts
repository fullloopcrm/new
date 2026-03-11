import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  if (!code) {
    return NextResponse.json({ error: 'Code required' }, { status: 400 })
  }

  // Look up referral by code
  const { data: referral } = await supabaseAdmin
    .from('referrals')
    .select('id, name, email, phone, referral_code, commission_rate, tenant_id, total_clicks, total_referrals, total_converted, total_earned, total_pending')
    .eq('referral_code', code)
    .single()

  if (!referral) {
    return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 })
  }

  // Get tenant info
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('id, name, slug, primary_color')
    .eq('id', referral.tenant_id)
    .single()

  if (!tenant) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 })
  }

  // Try to get commission history from referral_commissions table
  let commissions: { id: string; client_name: string; amount: number; status: string; created_at: string }[] = []
  try {
    const { data: commissionData } = await supabaseAdmin
      .from('referral_commissions')
      .select('id, client_name, amount, status, created_at')
      .eq('referral_id', referral.id)
      .order('created_at', { ascending: false })
      .limit(50)

    commissions = commissionData || []
  } catch {
    // Table may not exist yet
  }

  // Increment view count (track dashboard visits)
  try {
    await supabaseAdmin
      .from('referrals')
      .update({ total_clicks: (referral.total_clicks || 0) + 1 })
      .eq('id', referral.id)
  } catch {
    // Column may not exist
  }

  return NextResponse.json({
    referrer: {
      id: referral.id,
      name: referral.name,
      referral_code: referral.referral_code,
      commission_rate: referral.commission_rate || 10,
    },
    tenant: {
      name: tenant.name,
      slug: tenant.slug,
      primary_color: tenant.primary_color || '#0d9488',
    },
    stats: {
      total_clicks: referral.total_clicks || 0,
      total_referrals: referral.total_referrals || 0,
      total_converted: referral.total_converted || 0,
      total_earned: referral.total_earned || 0,
      total_pending: referral.total_pending || 0,
    },
    commissions,
  })
}
