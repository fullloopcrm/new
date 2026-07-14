/**
 * Manual lead creation (operator-side, dashboard). Guarantees a client row:
 * every lead/booking in the system must have a client, so this find-or-creates
 * a client (dedupe by phone, then email, tenant-scoped) BEFORE creating the
 * sales-mode deal at stage 'new'. Mirrors the client dedupe used by
 * /api/contact + /api/lead so manual entry lands the same way as web leads.
 */
import { NextResponse } from 'next/server'
import { getTenantForRequest, AuthError } from '@/lib/tenant-query'
import { supabaseAdmin } from '@/lib/supabase'
import { randomInt } from 'crypto'
import { audit } from '@/lib/audit'
import { escapeHtml } from '@/lib/escape-html'

export async function POST(request: Request) {
  try {
    const { tenantId } = await getTenantForRequest()
    const body = await request.json().catch(() => ({} as Record<string, unknown>))

    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const service = typeof body.service === 'string' ? body.service.trim() : ''
    const notes = typeof body.notes === 'string' ? body.notes.trim() : ''
    const valueCents = Math.max(0, Math.round(Number(body.value_cents) || 0))

    if (!name || !phone || !email) {
      return NextResponse.json({ error: 'Name, phone, and email are all required.' }, { status: 400 })
    }

    // Find-or-create the client (dedupe by phone last-10, then email).
    const cleanPhone = phone.replace(/\D/g, '')
    let clientId: string | null = null

    if (cleanPhone.length >= 7) {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('phone', `%${cleanPhone.slice(-10)}%`)
        .limit(1)
      if (data && data.length > 0) clientId = data[0].id
    }
    if (!clientId && email) {
      const { data } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('email', email)
        .maybeSingle()
      if (data) clientId = data.id
    }
    if (!clientId) {
      const { data: created, error: cErr } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenantId,
          name,
          email: email || null,
          phone: phone || null,
          notes: notes || null,
          pin: String(randomInt(100000, 1000000)),
        })
        .select('id')
        .single()
      if (cErr || !created) {
        return NextResponse.json({ error: `Failed to create client: ${cErr?.message}` }, { status: 500 })
      }
      clientId = created.id
    }

    // Create the sales-mode deal at the front of the pipeline.
    const { data: deal, error: dErr } = await supabaseAdmin
      .from('deals')
      .insert({
        tenant_id: tenantId,
        client_id: clientId,
        title: service || 'New lead',
        stage: 'new',
        mode: 'sales',
        value_cents: valueCents,
        probability: 25,
        source: 'manual',
        notes: notes || null,
        status: 'active',
      })
      .select('*, clients(id, name, email, phone, address, status)')
      .single()
    if (dErr || !deal) {
      return NextResponse.json({ error: dErr?.message || 'Failed to create lead' }, { status: 500 })
    }

    // Seed the timeline so the note carries through every stage.
    const openingNote = [service ? `Service: ${service}` : '', notes]
      .filter(Boolean)
      .join('\n')
    await supabaseAdmin.from('deal_activities').insert({
      tenant_id: tenantId,
      deal_id: deal.id,
      type: 'note',
      description: `Lead created manually${openingNote ? `\n${openingNote}` : ''}`,
      metadata: { source: 'manual' },
    })

    await audit({ tenantId, action: 'deal.created', entityType: 'deal', entityId: deal.id, details: { client_id: clientId, source: 'manual' } })

    const { ownerAlert } = await import('@/lib/messaging/owner-alerts')
    await ownerAlert({
      tenantId,
      subject: `New lead — ${name}`,
      kicker: 'New lead',
      heading: `${name} just came in`,
      bodyHtml: `<p style="margin:0 0 12px">A new lead landed in your pipeline.</p><p style="margin:0"><strong>${escapeHtml(name)}</strong>${phone ? ` · ${escapeHtml(phone)}` : ''}${service ? `<br>${escapeHtml(service)}` : ''}</p>`,
      sms: `New lead: ${name}${phone ? ` (${phone})` : ''} — in your pipeline now.`,
    })

    return NextResponse.json({ deal })
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status })
    console.error('POST /api/deals/manual error:', err)
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
  }
}
