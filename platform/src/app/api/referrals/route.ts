import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    // Was previously reachable by ANY authenticated team member via
    // getTenantForRequest() alone -- staff (no referrals.view by default)
    // could list every referral code, client name, and commission_rate.
    const { tenant, error: authError } = await requirePermission('referrals.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('referrals')
      .select('*, clients!referrals_referrer_client_id_fkey(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      // Fallback without join if FK doesn't match
      const { data: fallback } = await supabaseAdmin
        .from('referrals')
        .select('*')
        .eq('tenant_id', tenantId)
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
    // Same gap as GET above -- staff (no referrals.create by default) could
    // otherwise mint arbitrary referral codes/commission rates.
    const { tenant, error: authError } = await requirePermission('referrals.create')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      code: { type: 'string', max: 50 },
      commission_rate: { type: 'number', min: 0 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields! as Record<string, unknown>

    // Generate referral code if not provided
    if (!validated.code) {
      validated.referral_code = Math.random().toString(36).substring(2, 8).toUpperCase()
    } else {
      validated.referral_code = validated.code
      delete validated.code
    }

    const { data, error } = await supabaseAdmin
      .from('referrals')
      .insert({ ...validated, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'referral.created', entityType: 'referral', entityId: data.id, details: { name: data.name, code: data.referral_code } })

    return NextResponse.json({ referral: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
