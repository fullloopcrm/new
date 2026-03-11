import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  let query = supabaseAdmin
    .from('referrals')
    .select('*, tenants(name)')
    .order('created_at', { ascending: false })

  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query

  if (error) {
    // Fallback without tenant join
    let fallbackQuery = supabaseAdmin
      .from('referrals')
      .select('*')
      .order('created_at', { ascending: false })
    if (tenantId) fallbackQuery = fallbackQuery.eq('tenant_id', tenantId)

    const { data: fallback } = await fallbackQuery
    return NextResponse.json({ referrals: fallback || [] })
  }

  const referrals = data || []
  const stats = {
    total: referrals.length,
    totalCommission: referrals.reduce((sum, r) => sum + (r.total_earned || 0), 0),
    activeReferrers: referrals.filter(r => r.status === 'active').length,
  }

  return NextResponse.json({ referrals, stats })
}
