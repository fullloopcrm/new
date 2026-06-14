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
    const notes = (body.details || body.message || '').trim() || null

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
