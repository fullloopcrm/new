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
    const fields = pick(body, ['name', 'type', 'subject', 'body', 'recipient_filter', 'status', 'scheduled_at', 'campaign_type', 'reply_credit_cents'])

    // Once a campaign is sent/sending, this route had no guard at all: any
    // campaigns.create-permitted user could PUT status back to 'draft'
    // (re-arming the atomic claim in send/route.ts for a real re-send that
    // bills/delivers to the whole audience again) or silently rewrite
    // subject/body/recipient_filter on a campaign that's already gone out,
    // falsifying the same campaign_recipients audit trail the DELETE guard
    // exists to protect (see route.delete-guard.test.ts). CAS on the current
    // status closes the write side of that gap the same way the DELETE
    // handler already closed the destroy side.
    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .update(fields)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .neq('status', 'sent')
      .neq('status', 'sending')
      .select()
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      const { data: existing } = await supabaseAdmin
        .from('campaigns')
        .select('id, status')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!existing) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(
        { error: 'This campaign has already been sent or is sending and can no longer be edited.' },
        { status: 409 }
      )
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
