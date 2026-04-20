/**
 * Deals (sales pipeline) — CRUD. Tenant-scoped. Ported from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

export async function GET() {
  try {
    const { tenantId } = await getTenantForRequest()
    const { data: deals, error } = await supabaseAdmin
      .from('deals')
      .select('*, clients(id, name, email, phone, address, status, created_at)')
      .eq('tenant_id', tenantId)
      .eq('stage', 'active')
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
    const { tenantId } = await getTenantForRequest()
    const { client_id, follow_up_at, follow_up_note, notes, source } = await request.json()
    if (!client_id) return NextResponse.json({ error: 'client_id is required' }, { status: 400 })

    const { data: existing } = await supabaseAdmin
      .from('deals')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('client_id', client_id)
      .eq('stage', 'active')
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'Client is already on the sales board' }, { status: 409 })
    }

    const { data: deal, error } = await supabaseAdmin
      .from('deals')
      .insert({
        tenant_id: tenantId,
        client_id,
        stage: 'active',
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
    const { tenantId } = await getTenantForRequest()
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
      await supabaseAdmin.from('deal_activities').insert(activities)
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
    const { tenantId } = await getTenantForRequest()
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
