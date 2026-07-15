/**
 * Deals (sales pipeline) — CRUD. Tenant-scoped. Ported from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

export async function GET() {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { data: deals, error } = await supabaseAdmin
      .from('deals')
      .select('*, clients(id, name, email, phone, address, status, created_at)')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('follow_up_at', { ascending: true, nullsFirst: false })
      .limit(500)
    if (error) throw error

    const now = new Date()
    const overdueCount = (deals || []).filter(d => d.follow_up_at && new Date(d.follow_up_at as string) < now).length
    return NextResponse.json({ deals: deals || [], overdueCount })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/deals error:', err)
    return NextResponse.json({ error: 'Failed to fetch deals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const body = await request.json()
    const {
      client_id,
      title,
      stage,
      value_cents,
      probability,
      expected_close_date,
      follow_up_at,
      follow_up_note,
      notes,
      source,
    } = body
    if (!client_id && !title) {
      return NextResponse.json({ error: 'client_id or title is required' }, { status: 400 })
    }

    // Confirm client_id (if given) belongs to this tenant -- otherwise a
    // foreign client's name/email/phone/address gets pulled into this
    // tenant's deal via the clients() join on this response and every later
    // GET, a cross-tenant PII leak (same class already fixed on
    // bookings/quotes/invoices in 534a5834/7907701b).
    if (client_id) {
      const { data: clientRow } = await supabaseAdmin
        .from('clients').select('id').eq('id', client_id).eq('tenant_id', tenantId).single()
      if (!clientRow) return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Only block duplicate open deal on same client if no title was given
    // (same client can have multiple distinct deals when titled).
    if (client_id && !title) {
      const { data: existing } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('client_id', client_id)
        .in('stage', ['new', 'qualifying', 'quoted', 'pending'])
        .limit(1)
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: 'Client is already on the sales board' }, { status: 409 })
      }
    }

    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .insert({
        tenant_id: tenantId,
        client_id: client_id || null,
        title: title || null,
        stage: stage || 'new',
        value_cents: Number(value_cents) || 0,
        probability: probability != null ? Number(probability) : 10,
        expected_close_date: expected_close_date || null,
        follow_up_at: follow_up_at || null,
        follow_up_note: follow_up_note || null,
        notes: notes || null,
        source: source || 'manual',
      })
      .select('*, clients(id, name, email, phone, address, status)')
      .single()
    if (error) throw error

    await supabaseAdmin.from('deal_activities').insert({
      tenant_id: tenantId,
      deal_id: deal.id,
      type: 'auto_created',
      description: 'Added to sales board',
    })

    return NextResponse.json(deal)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals error:', err)
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id, follow_up_at, follow_up_note, notes, stage } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const activities: Array<{ tenant_id: string; deal_id: string; type: string; description: string }> = []

    if (follow_up_at !== undefined) {
      updates.follow_up_at = follow_up_at
      updates.follow_up_note = follow_up_note || null
      if (follow_up_at) {
        const when = new Date(follow_up_at).toLocaleString('en-US', {
          timeZone: 'America/New_York',
          month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        })
        activities.push({
          tenant_id: tenantId,
          deal_id: id,
          type: 'follow_up_set',
          description: `Follow-up set for ${when}${follow_up_note ? ': ' + follow_up_note : ''}`,
        })
      }
    }

    if (notes !== undefined) updates.notes = notes

    if (stage === 'booked' || stage === 'removed') {
      updates.stage = stage
      updates.closed_at = new Date().toISOString()
    }

    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select('*, clients(id, name, email, phone, address, status)')
      .single()
    if (error) throw error

    if (activities.length > 0) {
      await supabaseAdmin.from('deal_activities').insert(activities)  // tenant-scope-ok: insert payload carries tenant_id (built above)
    }

    return NextResponse.json(deal)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('PUT /api/deals error:', err)
    return NextResponse.json({ error: 'Failed to update deal' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabaseAdmin.from('deals').delete().eq('id', id).eq('tenant_id', tenantId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('DELETE /api/deals error:', err)
    return NextResponse.json({ error: 'Failed to delete deal' }, { status: 500 })
  }
}
