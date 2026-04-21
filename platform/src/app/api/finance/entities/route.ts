import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { listEntities } from '@/lib/entity'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const entities = await listEntities(tenantId)
    return NextResponse.json({ entities })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json()
    if (!body.name) return NextResponse.json({ error: 'name required' }, { status: 400 })

    // If make_default, unset any existing default first (unique partial index enforces one)
    if (body.make_default) {
      await supabaseAdmin.from('entities').update({ is_default: false }).eq('tenant_id', tenantId).eq('is_default', true)
    }

    const { data, error } = await supabaseAdmin
      .from('entities')
      .insert({
        tenant_id: tenantId,
        name: body.name,
        legal_name: body.legal_name || null,
        ein: body.ein || null,
        entity_type: body.entity_type || null,
        address: body.address || null,
        city: body.city || null,
        state: body.state || null,
        zip: body.zip || null,
        fiscal_year_start: body.fiscal_year_start || 1,
        is_default: !!body.make_default,
      })
      .select('*')
      .single()
    if (error) throw error
    return NextResponse.json({ entity: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/finance/entities', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
