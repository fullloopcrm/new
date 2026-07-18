/**
 * Deal activities — notes/calls/texts/emails/quotes on a given deal.
 * Tenant-scoped. Ported from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'

const ALLOWED_TYPES = ['note', 'call', 'text', 'email', 'quote_sent'] as const

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.view')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params

    // Verify deal belongs to tenant before returning activities.
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('deal_activities')
      .select('*')
      .eq('deal_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('GET /api/deals/[id]/activities error:', err)
    return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenant: _authTenant, error: _authError } = await requirePermission('sales.edit')
    if (_authError) return _authError
    const { tenantId } = _authTenant
    const { id } = await params
    const { type, description, tagged_user_ids } = await request.json()

    if (!type || !description) {
      return NextResponse.json({ error: 'type and description are required' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
    }
    if (tagged_user_ids !== undefined && !Array.isArray(tagged_user_ids)) {
      return NextResponse.json({ error: 'tagged_user_ids must be an array' }, { status: 400 })
    }

    // Verify deal belongs to tenant.
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    // Only store tags for team members that actually belong to this tenant —
    // an operator's client can't paste in another tenant's user id.
    let taggedUserIds: string[] = []
    if (Array.isArray(tagged_user_ids) && tagged_user_ids.length > 0) {
      const candidates = tagged_user_ids.filter((v): v is string => typeof v === 'string')
      const { data: validMembers } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('tenant_id', tenantId)
        .in('id', candidates)
      taggedUserIds = (validMembers || []).map((m) => m.id)
    }

    const { data, error } = await supabaseAdmin
      .from('deal_activities')
      .insert({ tenant_id: tenantId, deal_id: id, type, description, tagged_user_ids: taggedUserIds })
      .select()
      .single()
    if (error) throw error

    // Logging work keeps the deal "fresh" (drives pipeline aging) and, for a
    // real outbound touch, stamps last_contacted_at so the operator sees it.
    const nowIso = new Date().toISOString()
    const dealUpdate: Record<string, unknown> = { updated_at: nowIso, last_activity_at: nowIso }
    if (type === 'call' || type === 'text' || type === 'email') {
      dealUpdate.last_contacted_at = nowIso
    }
    await supabaseAdmin
      .from('deals')
      .update(dealUpdate)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/[id]/activities error:', err)
    return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 })
  }
}
