import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { pick } from '@/lib/validate'

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
    // referrer_client_id FK (cross-tenant injection: GET /api/referrals joins
    // clients!referrals_referrer_client_id_fkey(name) unscoped by tenant).
    const safeBody = pick(body, ['status', 'name', 'email', 'phone', 'commission_rate', 'reward_amount', 'total_earned'])

    const { data, error } = await tenantDb(tenantId)
      .from('referrals')
      .update(safeBody)
      .eq('id', id)
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
