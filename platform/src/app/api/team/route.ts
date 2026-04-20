import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ team: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('team.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      email: { type: 'email' },
      phone: { type: 'phone' },
      role: { type: 'string', max: 100 },
      hourly_rate: { type: 'number', min: 0 },
      pay_rate: { type: 'number', min: 0 },
      working_days: { type: 'array' },
      avatar_url: { type: 'string', max: 1000 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })

    // Auto-generate 4-digit PIN (cryptographically random).
    // The DB enforces uniqueness via idx_team_members_tenant_pin_unique (migration 014);
    // a collision returns a 500 and the caller retries.
    const crypto = await import('node:crypto')
    const pin = String(1000 + crypto.randomInt(0, 9000))

    const { data, error } = await supabaseAdmin
      .from('team_members')
      .insert({ ...fields, tenant_id: tenantId, pin })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'team.created', entityType: 'team_member', entityId: data.id, details: { name: fields!.name } })

    return NextResponse.json({ member: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
