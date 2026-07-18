/**
 * Deal by id — read, update (title/value/probability/close date/notes/follow-up), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { checkDealDeletable } from '@/lib/deal-delete-guard'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .select('*, clients(id, name, email, phone, address)')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .single()
    if (error) throw error
    if (!deal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: activities } = await supabaseAdmin
      .from('deal_activities')
      .select('id, type, description, metadata, created_at')
      .eq('tenant_id', tenantId)
      .eq('deal_id', id)
      .order('created_at', { ascending: false })
      .limit(100)

    return NextResponse.json({ deal, activities: activities || [] })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/deals/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const body = await request.json()

    const { data: existing } = await supabaseAdmin
      .from('deals')
      .select('value_cents, client_id')
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .maybeSingle()
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    const assignables = [
      'title', 'value_cents', 'probability',
      'expected_close_date', 'source', 'notes',
      'follow_up_at', 'follow_up_note',
      'client_id', 'owner_id',
    ] as const
    for (const k of assignables) {
      if (k in body) updates[k] = body[k]
    }
    if ('title' in body) updates.title_override = true

    // Confirm a reassigned client_id belongs to this tenant -- otherwise a
    // foreign client's name/email/phone gets pulled into this deal via the
    // clients() join on this response and every later GET, a cross-tenant
    // PII leak (same class already fixed on bookings/quotes/invoices in
    // 534a5834/7907701b).
    if ('client_id' in updates && updates.client_id) {
      const { data: clientRow } = await supabaseAdmin
        .from('clients').select('id').eq('id', updates.client_id as string).eq('tenant_id', tenantId).single()
      if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // DELETE already blocks destroying a deal once it carries real revenue
    // history (stage 'sold', or a linked quote that's accepted/deposit-paid/
    // converted -- checkDealDeletable). PATCH had no equivalent: any
    // sales.edit caller could silently rewrite value_cents/client_id on that
    // same closed deal, misattributing already-collected revenue to a
    // different client or diverging the reported deal value from what
    // actually sold, with no audit trail and no way to reconcile it after
    // the fact. Only gate on an *actual* change to one of those two fields --
    // the dashboard's save form always resends the current value_cents
    // alongside notes/follow-up edits, so gating on mere field presence would
    // block ordinary post-sale note-taking.
    const changingValue = 'value_cents' in updates && updates.value_cents !== existing.value_cents
    const changingClient = 'client_id' in updates && updates.client_id !== existing.client_id
    if (changingValue || changingClient) {
      const guard = await checkDealDeletable(tenantId, id)
      if (!guard.deletable) {
        return NextResponse.json({
          error: `This deal has closed real revenue and its value/client cannot be changed — ${guard.reason}`,
        }, { status: 409 })
      }
    }

    // Atomic claim when touching the financial fields: re-check stage hasn't
    // flipped to 'sold' in the same statement, closing the race window
    // between the guard read above and this write.
    let query = supabaseAdmin
      .from('deals')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (changingValue || changingClient) {
      query = query.neq('stage', 'sold')
    }
    const { data, error } = await query
      .select('*, clients(id, name, email, phone)')
      .maybeSingle()
    if (error) throw error
    if (!data) {
      return NextResponse.json({
        error: 'This deal was just marked Sold and its value/client can no longer be changed.',
      }, { status: 409 })
    }

    // Log follow-up scheduling as activity
    if ('follow_up_at' in body && body.follow_up_at) {
      const when = new Date(body.follow_up_at as string).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
      })
      await supabaseAdmin.from('deal_activities').insert({
        tenant_id: tenantId,
        deal_id: id,
        type: 'follow_up_set',
        description: `Follow-up set for ${when}${body.follow_up_note ? `: ${body.follow_up_note}` : ''}`,
      })
    }

    return NextResponse.json({ deal: data })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PATCH /api/deals/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    const guard = await checkDealDeletable(tenantId, id)
    if (!guard.deletable) {
      return NextResponse.json({ error: guard.reason }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('deals')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/deals/[id]', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
