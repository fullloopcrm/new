/**
 * Commission Sales Partners. Tenant-scoped. Ported from nycmaid
 * (sales_partners table, src/app/api/sales-partners/route.ts).
 *
 * GET ?code=... — public lookup by referral code (active partners only, no
 *                 financial fields). Used to validate a partner's share link.
 * GET (no params, admin session) — list every partner for the tenant.
 * PUT (admin) — update tier / active / commission_rate.
 *
 * Partner's own portal data (financials, recruited referrers) lives at
 * GET /api/sales-partners/me, gated by the signed session token from
 * POST /api/sales-partners/login — never by a bare code or id, same bar the
 * referrer portal was already raised to (see referrer-portal-auth.ts).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { requirePermission } from '@/lib/require-permission'
import { AuthError } from '@/lib/tenant-query'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')

  if (code) {
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    const rl = await rateLimitDb(`sales-partner-lookup:${ip}`, 10, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const lookupTenant = await getTenantFromHeaders()
    if (!lookupTenant) return NextResponse.json({ error: 'Unknown business' }, { status: 400 })

    const { data } = await supabaseAdmin
      .from('sales_partners')
      .select('id, name, referral_code')
      .eq('tenant_id', lookupTenant.id)
      .eq('referral_code', code.toUpperCase())
      .eq('active', true)
      .maybeSingle()

    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  }

  const { tenant, error: authError } = await requirePermission('sales_partners.view')
  if (authError) return authError

  const { data, error } = await supabaseAdmin
    .from('sales_partners')
    .select('id, name, email, phone, referral_code, tier, commission_rate, total_earned, total_paid, preferred_payout, zelle_email, zelle_phone, apple_cash_phone, active, approved_at, created_at')
    .eq('tenant_id', tenant.tenantId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: 'Failed to fetch sales partners' }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('sales_partners.manage')
    if (authError) return authError
    const { tenantId } = tenant

    const body = await request.json()
    const { id, active, tier, commission_rate } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

    const updates: Record<string, unknown> = {}
    if (typeof active === 'boolean') updates.active = active
    if (typeof tier === 'string' && ['standard', 'tier2', 'tier3'].includes(tier)) updates.tier = tier
    if (typeof commission_rate === 'number' && commission_rate >= 0 && commission_rate <= 1) updates.commission_rate = commission_rate
    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('sales_partners')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .maybeSingle()

    if (error) throw error
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('Sales partners PUT error:', err)
    return NextResponse.json({ error: 'Failed to update sales partner' }, { status: 500 })
  }
}
