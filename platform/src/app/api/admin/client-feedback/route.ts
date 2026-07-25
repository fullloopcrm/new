import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/require-admin'
import { supabaseAdmin } from '@/lib/supabase'
import { getCurrentTenant } from '@/lib/tenant'
import { sendSMS } from '@/lib/sms'

// Tenant-aware port from nycmaid.
//
// Uses getCurrentTenant() (not getTenantForRequest()) — this route is reached
// via /dashboard/clients/feedback under platform-admin PIN impersonation, not
// a tenant custom domain or a Clerk session. getTenantForRequest() only
// resolves tenant from the x-tenant-id header (tenant custom domain) or Clerk
// auth — it 401s under PIN impersonation. getCurrentTenant() is what the
// dashboard layout itself and /api/schedule/calendar already use, and is the
// only one of the two that checks the admin-PIN impersonation cookie.
export async function GET() {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  // totalCount/unreadCount need their own exact-count queries — data.length
  // was previously used for both, silently capped at 200 by the page limit
  // below (once feedback exceeds 200 rows, "X total"/"Y unread" freezes
  // wrong instead of reflecting the real count).
  const [{ data, error }, { count: totalCount }, { count: unreadCount }] = await Promise.all([
    supabaseAdmin
      .from('client_feedback')
      .select('*, clients(name, phone, email), campaigns(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin
      .from('client_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabaseAdmin
      .from('client_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('read', false),
  ])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    feedback: data,
    totalCount: totalCount || 0,
    unreadCount: unreadCount || 0,
  })
}

export async function PUT(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  const { id, read } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_feedback')
    .update({ read })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}

// Send a manual SMS reply to a client_feedback entry. Only valid for
// non-anonymous, client-linked feedback (category='client', is_anonymous=
// false, client_id set) — anonymous/unmatched submissions have no reliable
// phone to reply to. The client's next SMS reply is matched back to this
// entry by src/lib/feedback-reply.ts (via reply_requested_at) and appended
// to `notes`.
export async function POST(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  const { id, message } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  const { data: feedback } = await supabaseAdmin
    .from('client_feedback')
    .select('id, tenant_id, client_id, category, is_anonymous, notes')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!feedback) return NextResponse.json({ error: 'Feedback not found' }, { status: 404 })
  if (feedback.category !== 'client' || feedback.is_anonymous || !feedback.client_id) {
    return NextResponse.json({ error: 'This feedback entry has no client to reply to' }, { status: 400 })
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('id, name, phone')
    .eq('id', feedback.client_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (!client?.phone) return NextResponse.json({ error: 'Client has no phone on file' }, { status: 400 })

  const { data: tenantRow } = await supabaseAdmin
    .from('tenants')
    .select('telnyx_api_key, telnyx_phone')
    .eq('id', tenantId)
    .maybeSingle()
  if (!tenantRow?.telnyx_api_key || !tenantRow?.telnyx_phone) {
    return NextResponse.json({ error: 'SMS not configured for this tenant' }, { status: 400 })
  }

  try {
    await sendSMS({
      to: client.phone,
      body: message.trim(),
      telnyxApiKey: tenantRow.telnyx_api_key,
      telnyxPhone: tenantRow.telnyx_phone,
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to send text' }, { status: 502 })
  }

  const timestamp = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  const noteLine = `[You → ${client.name || 'client'}, ${timestamp}] ${message.trim()}`
  const updatedNotes = feedback.notes ? `${feedback.notes}\n${noteLine}` : noteLine

  await supabaseAdmin
    .from('client_feedback')
    .update({ notes: updatedNotes, reply_requested_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  return NextResponse.json({ success: true, notes: updatedNotes })
}

export async function DELETE(request: Request) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenant = await getCurrentTenant()
  if (!tenant) return NextResponse.json({ error: 'No tenant in context' }, { status: 400 })
  const tenantId = tenant.id

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('client_feedback')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
