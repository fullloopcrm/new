import { NextResponse } from 'next/server'
import { AuthError } from '@/lib/tenant-query'
import { requirePermission } from '@/lib/require-permission'
import { supabaseAdmin } from '@/lib/supabase'
import { validate } from '@/lib/validate'
import { audit } from '@/lib/audit'

export async function GET() {
  try {
    const { tenant, error: authError } = await requirePermission('campaigns.view')
    if (authError) return authError
    const { tenantId } = tenant

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ campaigns: data })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}

export async function POST(request: Request) {
  const { tenant, error: authError } = await requirePermission('campaigns.create')
  if (authError) return authError

  try {
    const { tenantId } = tenant
    const body = await request.json()

    const { data: fields, error: vError } = validate(body, {
      name: { type: 'string', required: true, max: 200 },
      type: { type: 'string', required: true, max: 50 },
      subject: { type: 'string', max: 500 },
      body: { type: 'string', max: 10000 },
      recipient_filter: { type: 'string', max: 500 },
      // The create form's "Schedule (optional)" datetime-local input has
      // always sent this in the POST body (see campaigns/page.tsx), but it
      // was missing from this allowlist, so validate() silently dropped it
      // on every create — the row's scheduled_at stayed null regardless of
      // what the admin picked, and the list view's "Scheduled {date}" label
      // (which reads campaign.scheduled_at) could never render for a
      // freshly-created campaign. PATCH /api/campaigns/[id] already accepts
      // this same field via pick() — only POST was missing it.
      scheduled_at: { type: 'date' },
    })
    if (vError) return NextResponse.json({ error: vError }, { status: 400 })

    // scheduled_at landing on the row was only half the earlier fix: with
    // status always forced to 'draft', a campaign the admin scheduled had no
    // way to ever be distinguished from a plain draft. The dashboard's
    // "Scheduled" tab/counter filters on status === 'scheduled' (never
    // populated) and no cron ever looked for due campaigns to dispatch
    // (see /api/cron/campaign-dispatch) — both dead ends traced back to this
    // one insert never setting the status a scheduled campaign needs.
    const status = fields!.scheduled_at ? 'scheduled' : 'draft'

    const { data, error } = await supabaseAdmin
      .from('campaigns')
      .insert({ ...fields, tenant_id: tenantId, status })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await audit({ tenantId, action: 'campaign.created', entityType: 'campaign', entityId: data.id, details: { name: data.name, type: data.type } })

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }
}
