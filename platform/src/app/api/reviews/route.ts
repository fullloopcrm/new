import { NextResponse } from 'next/server'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'

export async function GET() {
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
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })

    // client_id is a caller-supplied FK with no cross-tenant check at the DB
    // layer, and GET /api/reviews joins clients(name) off it unscoped by
    // tenant -- an unverified client_id would let a caller plant a review
    // pointing at a foreign tenant's client, then leak that client's name
    // back out on the next GET (same class already guarded on PUT).
    const clientId = (fields as Record<string, unknown>).client_id as string | null
    if (clientId) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single()
      if (!client) {
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
    throw e
  }
}
