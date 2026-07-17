import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'

interface CommissionRow {
  id: string
  tenant_id: string
  client_name: string | null
  commission_cents: number | null
  gross_amount_cents: number | null
  status: string
  created_at: string
  paid_at: string | null
  referrers: { name: string | null; email: string | null; status: string | null } | null
  bookings: { clients: { email: string | null } | null } | null
  tenants: { name: string | null } | null
}

// This page renders the *affiliate referrer commission* program (name/email,
// commission $, "paid" vs "pending"), not `referrals` (the unrelated
// client-referred-a-client rewards table item (76) fixed — see that table's
// own comment in src/lib/migrations/019_referral_commissions.sql: "Distinct
// from `referrals` (client-to-client)"). The prior query read `referrals`
// and reduced on `total_earned`/`status:'active'`, neither of which is a
// column on that table, so the stat cards always computed 0 and the
// dashboard/admin/referrals/page.tsx UI (which expects referrer_name,
// referrer_email, reward_status, revenue_generated — all referrer/commission
// fields) rendered every row's referrer/referee name as `undefined`, and its
// unguarded `r.referrer_name.toLowerCase()` search-filter call would throw
// as soon as a real referral existed.
export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  const tenantId = request.nextUrl.searchParams.get('tenant_id')

  let commissionsQuery = supabaseAdmin
    .from('referral_commissions')
    .select('*, referrers(name, email, status), bookings(clients(email)), tenants(name)')
    .order('created_at', { ascending: false })
  if (tenantId) commissionsQuery = commissionsQuery.eq('tenant_id', tenantId)

  const [commissionsRes, tenantsRes] = await Promise.all([
    commissionsQuery,
    supabaseAdmin.from('tenants').select('id, name').neq('status', 'deleted').order('name'),
  ])

  if (commissionsRes.error) {
    return NextResponse.json({
      referrals: [],
      tenants: tenantsRes.data || [],
      stats: { total: 0, totalCommission: 0, activeReferrers: 0 },
    })
  }

  const rows = (commissionsRes.data || []) as unknown as CommissionRow[]
  const referrals = rows.map((r) => ({
    id: r.id,
    tenant_id: r.tenant_id,
    tenant_name: r.tenants?.name || '',
    referrer_name: r.referrers?.name || '',
    referrer_email: r.referrers?.email || '',
    referee_name: r.client_name || '',
    referee_email: r.bookings?.clients?.email || '',
    status: r.referrers?.status || 'active',
    reward_amount: r.commission_cents || 0,
    reward_status: r.status,
    revenue_generated: r.gross_amount_cents || 0,
    created_at: r.created_at,
    converted_at: r.paid_at,
  }))

  const stats = {
    total: referrals.length,
    totalCommission: rows.reduce((sum, r) => sum + (r.commission_cents || 0), 0),
    activeReferrers: rows.filter((r) => r.referrers?.status === 'active').length,
  }

  return NextResponse.json({ referrals, tenants: tenantsRes.data || [], stats })
}
