import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('reviews.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .select('*, clients(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ reviews: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  try {
    const { tenant, error: authError } = await requirePermission('reviews.request')
    if (authError) return authError
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      client_id: { type: 'uuid' },
      rating: { type: 'number', min: 1, max: 5 },
      comment: { type: 'string', max: 5000 },
      source: { type: 'string', max: 100 },
      status: { type: 'string', max: 50 },
    })
    if (vError || !fields) return NextResponse.json({ error: vError ?? 'Invalid request body' }, { status: 400 })

    // client_id is a caller-supplied FK — clients has no cross-tenant FK
    // check, and GET's clients(name) join on this table is unscoped by
    // tenant, so a foreign client_id would leak another tenant's client
    // name into this tenant's review list. Verify ownership before insert.
    if (fields.client_id) {
      const { data: ownedClient } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', fields.client_id as string)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!ownedClient) {
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .insert({ ...fields, tenant_id: tenantId })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ review: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
