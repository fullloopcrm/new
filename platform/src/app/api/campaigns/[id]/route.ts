import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { pick } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('campaigns.view')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('campaigns.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params
    const body = await request.json()
    const fields = pick(body, ['name', 'type', 'subject', 'body', 'recipient_filter', 'status', 'scheduled_at'])

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaign: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { tenant, error: authError } = await requirePermission('campaigns.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const { id } = await params

    // campaign_recipients has campaign_id ON DELETE CASCADE (migration 008) --
    // it's the per-recipient send/bounce/delivery audit trail. Once a campaign
    // has actually gone out, hard-deleting the row silently destroys that
    // record with it. The UI already only offers Delete for status:'draft'
    // (dashboard/campaigns/page.tsx), but that's client-side only; this
    // enforces it server-side so a direct API call can't bypass it.
    const { data: existing } = await supabaseAdmin
      .from('campaigns')
      .select('status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (existing.status !== 'draft') {
      return NextResponse.json({ error: 'Only draft campaigns can be deleted. This campaign has already been sent or scheduled.' }, { status: 409 })
    }

    const { error } = await supabaseAdmin
      .from('campaigns')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'campaign.deleted', entityType: 'campaign', entityId: id })

    return NextResponse.json({ success: true })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
