import { NextRequest, NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { verifyPortalToken } from '../auth/token'
import { ownerAlert } from '@/lib/messaging/owner-alerts'
import { escapeHtml } from '@/lib/escape-html'

// Client "request a quote / appointment" for pipeline & lead_only tenants (trades
// that don't self-serve an hourly time slot). Drops the request into the SAME
// sales pipeline the core process uses (deals), tied to the logged-in client —
// it does not create a scheduled booking.
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const auth = verifyPortalToken(token)
  if (!auth) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const serviceName: string = (body.service_name || '').toString().slice(0, 120)
  const preferredDate: string = (body.preferred_date || '').toString().slice(0, 40)
  const message: string = (body.notes || '').toString().slice(0, 1000)

  const { data: client } = await tenantDb(auth.tid)
    .from('clients')
    .select('id, name')
    .eq('id', auth.id)
    .single()
  if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 })

  const nowIso = new Date().toISOString()
  const noteLines = [
    serviceName ? `Service: ${serviceName}` : null,
    preferredDate ? `Preferred: ${preferredDate}` : null,
    message || null,
  ].filter(Boolean)
  const notes = noteLines.join('\n')

  // Reuse an open deal for this client rather than stacking duplicates
  // (mirrors /api/contact). tenantDb's select() takes a non-literal `columns`
  // param, which widens supabase-js's column-string type inference — cast
  // the narrow-select result to the shape actually selected (see
  // portal/connect/unread for the same gap).
  const { data: openDeal } = (await tenantDb(auth.tid)
    .from('deals')
    .select('id, notes')
    .eq('client_id', client.id)
    .in('stage', ['new', 'qualifying', 'quoted', 'pending'])
    .order('created_at', { ascending: false })
    .maybeSingle()) as { data: { id: string; notes: string | null } | null }

  if (openDeal) {
    const merged = [openDeal.notes, `[${nowIso.slice(0, 10)} portal request]`, notes].filter(Boolean).join('\n')
    await tenantDb(auth.tid)
      .from('deals')
      .update({ notes: merged, last_activity_at: nowIso })
      .eq('id', openDeal.id)
  } else {
    await tenantDb(auth.tid).from('deals').insert({
      client_id: client.id,
      title: serviceName || 'Portal request',
      stage: 'new',
      mode: 'sales',
      value_cents: 0,
      probability: 10,
      source: 'portal',
      notes: notes || null,
      status: 'active',
      last_activity_at: nowIso,
    })
  }

  await ownerAlert({
    tenantId: auth.tid,
    kicker: 'Portal request',
    heading: `${client.name || 'A client'} requested service`,
    bodyHtml: noteLines.map((l) => `<div>${escapeHtml(l)}</div>`).join('') || '<div>New request from the client portal.</div>',
    sms: `New portal request from ${client.name || 'a client'}${serviceName ? `: ${serviceName}` : ''}`,
    subject: `New portal request from ${client.name || 'a client'}`,
  })

  return NextResponse.json({ ok: true })
}
