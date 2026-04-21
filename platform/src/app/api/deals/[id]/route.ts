/**
 * Deal by id — read, update (title/value/probability/close date/notes/follow-up), delete.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  try {
    const { tenantId } = await getTenantForRequest()
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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const body = await request.json()

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

    const { data, error } = await supabaseAdmin
      .from('deals')
      .update(updates)
      .eq('tenant_id', tenantId)
      .eq('id', id)
      .select('*, clients(id, name, email, phone)')
      .single()
    if (error) throw error

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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
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
