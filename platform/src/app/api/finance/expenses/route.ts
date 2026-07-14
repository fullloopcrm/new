import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { tenantDb } from '@/lib/tenant-db'
import { validate } from '@/lib/validate'
import { entityIdFromUrl, getDefaultEntityId } from '@/lib/entity'
import { audit } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entityId = entityIdFromUrl(new URL(request.url))

    let q = tenantDb(tenantId)
      .from('expenses')
      .select('*')
      .order('date', { ascending: false })
    if (entityId) q = q.eq('entity_id', entityId)

    const { data, error } = await q

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ expenses: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('finance.expenses')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      category: { type: 'string', required: true, max: 100 },
      amount: { type: 'number', required: true, min: 0 },
      description: { type: 'string', max: 1000 },
      receipt_url: { type: 'url' },
      date: { type: 'date' },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields!

    const entityId = body.entity_id || (await getDefaultEntityId(tenantId))

    const { data, error } = await tenantDb(tenantId)
      .from('expenses')
      .insert({
        entity_id: entityId,
        category: validated.category,
        amount: Math.round(Number(validated.amount) * 100),
        description: validated.description || null,
        receipt_url: validated.receipt_url || null,
        date: validated.date || new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'expense.created', entityType: 'expense', entityId: data.id, details: { category: data.category, amount: data.amount } })

    return NextResponse.json({ expense: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
