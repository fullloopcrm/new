import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
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

    const { data, error } = await db
      .from('referrals')
      .insert(validated)
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
