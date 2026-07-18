import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { entityIdFromUrl, getDefaultEntityId, isEntityOwnedByTenant } from '@/lib/entity'
import { audit } from '@/lib/audit'

export async function GET(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('finance.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const entityId = entityIdFromUrl(new URL(request.url))

    let q = supabaseAdmin
      .from('expenses')
      .select('*')
      .eq('tenant_id', tenantId)
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
      job_id: { type: 'uuid' },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })
    const validated = fields!

    // A foreign entity_id here is a dangling cross-tenant reference (other
    // finance routes join entities(name) by entity_id) -- keep it in-tenant.
    if (body.entity_id && !(await isEntityOwnedByTenant(tenantId, body.entity_id))) {
      return NextResponse.json({ error: 'Entity not found' }, { status: 404 })
    }
    const entityId = body.entity_id || (await getDefaultEntityId(tenantId))

    // Same in-tenant check as entity_id above -- a manual expense entry can
    // optionally tie itself to a job (feeds that job's Costs & Receipts cost
    // tracking) without going through the job-scoped endpoint.
    if (validated.job_id) {
      const { data: job } = await supabaseAdmin
        .from('jobs')
        .select('id')
        .eq('id', validated.job_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    const { data, error } = await supabaseAdmin
      .from('expenses')
      .insert({
        tenant_id: tenantId,
        entity_id: entityId,
        category: validated.category,
        amount: Math.round(Number(validated.amount) * 100),
        description: validated.description || null,
        receipt_url: validated.receipt_url || null,
        date: validated.date || new Date().toISOString().split('T')[0],
        job_id: validated.job_id || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'expense.created', entityType: 'expense', entityId: data.id, details: { category: data.category, amount: data.amount } })

    // notify.ts's own NotificationType union has declared 'expense_added' for
    // exactly this event since notify.ts's beginning (and it's listed in the
    // admin docs' own "Notification Types" reference) — no call site here
    // ever used it. Same declared-but-never-fired class as items
    // (63)/(66)/(67)/(68).
    try {
      const { notify } = await import('@/lib/notify')
      await notify({
        tenantId,
        type: 'expense_added',
        title: `Expense added: ${data.category}`,
        message: `$${(data.amount / 100).toFixed(2)}${data.description ? ` — ${data.description}` : ''}`,
        channel: 'email',
        recipientType: 'admin',
        metadata: { expense_id: data.id },
      })
    } catch (e) {
      console.warn('notify expense_added failed', e)
    }

    return NextResponse.json({ expense: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
