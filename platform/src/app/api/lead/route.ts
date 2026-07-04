/**
 * Public single-lead capture (tenant resolved from host). Tenant-aware analog
 * of the standalone /api/lead route used by several marketing sites
 * (nyc-tow, toll-trucks-near-me, the-home-services-company, we-pay-you-junk).
 *
 * Accepts the payload those forms already send: { type, name, email, phone,
 * details, source }. Writes to clients + portal_leads and notifies admins —
 * same destination as /api/contact, so leads land in the tenant backend.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { emailAdmins } from '@/lib/admin-contacts'
import { adminNewClientEmail } from '@/lib/email-templates'
import { trackError } from '@/lib/error-tracking'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'
import { randomInt } from 'crypto'

interface LeadBody {
  type?: string
  name?: string
  email?: string
  phone?: string
  details?: string
  message?: string
  source?: string
  [key: string]: unknown
}

// Standard fields handled explicitly; everything else a form sends
// (service, address, city, budget, timeframe, etc.) is folded into notes
// so no field is silently dropped.
const STANDARD_KEYS = new Set(['type', 'name', 'email', 'phone', 'details', 'message', 'source'])

function buildLeadNotes(body: LeadBody): string | null {
  const lines: string[] = []
  const base = (body.details || body.message || '').toString().trim()
  for (const [k, v] of Object.entries(body)) {
    if (STANDARD_KEYS.has(k)) continue
    if (v === undefined || v === null || v === '') continue
    const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    lines.push(`${label}: ${String(v)}`)
  }
  const extra = lines.join('\n')
  const combined = [extra, base].filter(Boolean).join('\n\n').trim()
  return combined || null
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromHeaders()
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found for this host' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = await rateLimitDb(`lead:${tenant.id}:${ip}`, 5, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please wait a few minutes.' }, { status: 429 })
    }

    const body = (await request.json()) as LeadBody
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase() || null
    const phoneRaw = body.phone?.trim() || ''
    const notes = buildLeadNotes(body)

    if (!name || (!email && !phoneRaw)) {
      return NextResponse.json({ error: 'Name and a phone or email are required.' }, { status: 400 })
    }

    const cleanPhone = phoneRaw.replace(/\D/g, '')
    const phone = phoneRaw || null
    let clientId: string

    // Dedupe by phone only when we have a usable number.
    const { data: existing } = cleanPhone.length >= 7
      ? await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tenant.id)
          .ilike('phone', `%${cleanPhone.slice(-10)}%`)
          .limit(1)
      : { data: null as { id: string }[] | null }

    if (existing && existing.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('clients')
        .update({ name, email, notes, active: true, status: 'active' })
        .eq('id', existing[0].id)
        .eq('tenant_id', tenant.id)
        .select('id')
        .single()
      if (error) throw error
      clientId = updated.id
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          name,
          email,
          phone,
          notes,
          pin: randomInt(100000, 1000000).toString(),
        })
        .select('id')
        .single()
      if (error) throw error
      clientId = inserted.id
    }

    await supabaseAdmin
      .from('portal_leads')
      .insert({
        tenant_id: tenant.id,
        name,
        email,
        phone,
        notes,
        source: body.source || body.type || 'lead-form',
        client_id: clientId,
      })
      .then(() => {}, () => {})

    // ─── enter the sales pipeline ───
    // A web lead must become a DEAL so it shows in Sales > Leads. Dedupe on an
    // existing OPEN deal for this client (append a note) else create a new one.
    // Non-blocking — a form submit never fails on a pipeline error.
    const leadSource = body.source || body.type || 'lead-form'
    try {
      const { data: openDeal } = await supabaseAdmin
        .from('deals')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('client_id', clientId)
        .in('stage', ['new', 'qualifying', 'quoted', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const nowIso = new Date().toISOString()
      if (openDeal) {
        await supabaseAdmin.from('deal_activities').insert({
          tenant_id: tenant.id, deal_id: openDeal.id, type: 'note',
          description: `New web submission [${leadSource}]${notes ? `\n${notes}` : ''}`,
          metadata: { source: leadSource },
        })
        await supabaseAdmin.from('deals').update({ last_activity_at: nowIso }).eq('id', openDeal.id).eq('tenant_id', tenant.id)
      } else {
        const { data: newDeal } = await supabaseAdmin.from('deals').insert({
          tenant_id: tenant.id, client_id: clientId,
          title: name || 'New lead', stage: 'new', mode: 'sales',
          value_cents: 0, probability: 10, source: leadSource,
          notes: notes || null, status: 'active', last_activity_at: nowIso,
        }).select('id').single()
        if (newDeal) {
          await supabaseAdmin.from('deal_activities').insert({
            tenant_id: tenant.id, deal_id: newDeal.id, type: 'note',
            description: `Lead captured via web form [${leadSource}]`,
            metadata: { source: leadSource },
          })
        }
      }
    } catch (dealErr) {
      console.error('[api/lead] pipeline deal error (non-blocking):', dealErr)
    }

    await notify({
      tenantId: tenant.id,
      type: 'new_client',
      title: 'New Lead',
      message: `${name}${phone ? ' • ' + phone : ''}`,
    }).catch((err) => console.error('[api/lead] notify error:', err))

    try {
      const adminUrl = `${tenantSiteUrl(tenant)}/admin/clients`
      const msg = adminNewClientEmail(
        { name, phone: phone || '', email: email || undefined, notes: notes || undefined },
        {
          tenantName: tenant.name,
          primaryColor: tenant.primary_color || undefined,
          logoUrl: tenant.logo_url || undefined,
          adminUrl,
        },
      )
      await emailAdmins(tenant, msg.subject, msg.html)
    } catch (emailErr) {
      console.error('[api/lead] lead email error:', emailErr)
    }

    return NextResponse.json({ success: true, client_id: clientId })
  } catch (err) {
    console.error('[api/lead] error:', err)
    await trackError(err, { source: 'api/lead', severity: 'high' }).catch(() => {})
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
