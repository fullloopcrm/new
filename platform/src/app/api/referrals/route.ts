import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('referrals.view')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)

    const { data, error } = await db
      .from('referrals')
      .select('*, clients!referrals_referrer_client_id_fkey(name)')
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback without join if FK doesn't match
      const { data: fallback } = await db
        .from('referrals')
        .select('*')
        .order('created_at', { ascending: false })

      return NextResponse.json({ referrals: fallback })
    }

    return NextResponse.json({ referrals: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('referrals.create')
    if (authError) return authError
    const { tenantId } = tenant
    const db = tenantDb(tenantId)
    const body = await request.json()

    // referrals is the client-referred-a-client reward table (columns:
    // referrer_client_id, referred_client_id, referral_code, status,
    // reward_amount -- see supabase/schema.sql). This previously validated
    // and inserted name/email/phone/code/commission_rate, the *referrers*
    // (referral-partner/commission) table's shape from a different feature
    // (see /api/referrers) -- referrals has none of those columns, so every
    // insert would have failed with an "unknown column" error even before
    // the dashboard's own create form (which only ever sends
    // referrer_client_id + reward_amount) got past the now-fixed validator:
    // 'name' was required but never sent, so POST always 400'd first.
    const { data: fields, error: vError } = validate(body, {
      referrer_client_id: { type: 'uuid', required: true },
      referred_client_id: { type: 'uuid' },
      reward_amount: { type: 'number', min: 0 },
      status: { type: 'string', max: 50 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields! as Record<string, unknown>

    // Caller-supplied client FKs -- verify both belong to this tenant before
    // insert (this table's own GET join is unscoped by tenant on the joined
    // side, same cross-tenant-FK-injection shape already guarded on
    // schedules.client_id / reviews.client_id / clients.referrer_id).
    for (const key of ['referrer_client_id', 'referred_client_id'] as const) {
      if (!validated[key]) continue
      const { data: ownedClient } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', validated[key] as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedClient) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    validated.referral_code = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data, error } = await db
      .from('referrals')
      .insert(validated)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'referral.created', entityType: 'referral', entityId: data.id, details: { referrer_client_id: data.referrer_client_id, code: data.referral_code } })

    return NextResponse.json({ referral: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
