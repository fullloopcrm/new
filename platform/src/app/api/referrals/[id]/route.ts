import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('referrals.payout')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()

    // Allow-listed scalars only — never accept tenant_id (row donation) or the
    // referrer_client_id/referred_client_id FKs (cross-tenant injection) here.
    const updates: Record<string, unknown> = {}
    for (const k of ['status', 'reward_amount']) {
      if (k in body) updates[k] = body[k]
    }

    const { data, error } = await supabaseAdmin
      .from('referrals')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ referral: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
