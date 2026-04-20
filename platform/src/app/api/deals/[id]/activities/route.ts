/**
 * Deal activities — notes/calls/texts/emails/quotes on a given deal.
 * Tenant-scoped. Ported from nycmaid.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'

const ALLOWED_TYPES = ['note', 'call', 'text', 'email', 'quote_sent'] as const

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { tenantId } = await getTenantForRequest()
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
    const { tenantId } = await getTenantForRequest()
    const { id } = await params
    const { type, description } = await request.json()

    if (!type || !description) {
      return NextResponse.json({ error: 'type and description are required' }, { status: 400 })
    }
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: `type must be one of: ${ALLOWED_TYPES.join(', ')}` }, { status: 400 })
    }

    // Verify deal belongs to tenant.
    const { data: deal } = await supabaseAdmin
      .from('deals')
      .select('id')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()
    if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

    const { data, error } = await supabaseAdmin
      .from('deal_activities')
      .insert({ tenant_id: tenantId, deal_id: id, type, description })
      .select()
      .single()
    if (error) throw error

    await supabaseAdmin
      .from('deals')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/[id]/activities error:', err)
    return NextResponse.json({ error: 'Failed to add activity' }, { status: 500 })
  }
}
