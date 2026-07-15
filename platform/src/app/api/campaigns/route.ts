import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  const { tenant, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('campaigns.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      type: { type: 'string', required: true, max: 50 },
      subject: { type: 'string', max: 500 },
      body: { type: 'string', max: 10000 },
      recipient_filter: { type: 'string', max: 500 },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({ ...fields, tenant_id: tenantId, status: 'draft' })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'campaign.created', entityType: 'campaign', entityId: data.id, details: { name: data.name, type: data.type } })

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
