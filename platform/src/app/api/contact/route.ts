/**
 * Public contact-form lead-capture (tenant resolved from host).
 *
 * Built as the tenant-aware analog of the per-tenant clone /api/contact route
 * that lived in the standalone tenant repos (e.g. thenycexterminator). Accepts
 * three form shapes from those sites:
 *   - service-quote (no explicit formType): pestType/propertyType/urgency/location
 *   - general-inquiry (formType: "general-inquiry"): subject
 *   - job-application (formType: "job-application"): position/experience/license/availability
 *
 * Lead types write to clients + portal_leads (mirrors /api/portal/collect).
 * Job applications write to team_applications — the canonical table the admin
 * reads (GET /api/team-applications) and the approve→provision→PIN flow uses.
 * (Previously wrote the dead cleaner_applications table, so apps never showed
 * in admin.) Admin notification goes through emailAdmins which reads
 * tenant.resend_api_key.
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

interface ContactBody {
  formType?: string
  name?: string
  email?: string
  phone?: string
  address?: string
  message?: string
  subject?: string
  session_id?: string
  // service-quote
  pestType?: string
  propertyType?: string
  location?: string
  urgency?: string
  // self-book online (eligible for online-booking discount)
  selfBook?: boolean
  // job-application
  position?: string
  experience?: string
  license?: string
  availability?: string
}

function inferFormType(body: ContactBody): 'service-quote' | 'general-inquiry' | 'job-application' {
  if (body.formType === 'job-application' || body.position) return 'job-application'
  if (body.formType === 'general-inquiry' || body.subject) return 'general-inquiry'
  return 'service-quote'
}

// $10 discount for customers who book online instead of calling/texting.
const SELF_BOOK_DISCOUNT_NOTE = '💲 SELF-BOOK ONLINE — apply $10 discount to quote'

function buildLeadNotes(form: string, body: ContactBody): string {
  const lines: string[] = [`[${form}]`]
  if (body.selfBook) lines.push(SELF_BOOK_DISCOUNT_NOTE)
  if (body.pestType) lines.push(`Pest: ${body.pestType}`)
  if (body.propertyType) lines.push(`Property: ${body.propertyType}`)
  if (body.urgency) lines.push(`Urgency: ${body.urgency}`)
  if (body.address) lines.push(`Address: ${body.address}`)
  if (body.location) lines.push(`Location: ${body.location}`)
  if (body.subject) lines.push(`Subject: ${body.subject}`)
  if (body.message) lines.push('', body.message.trim())
  return lines.join('\n').trim()
}

function buildJobNotes(body: ContactBody): string {
  const lines: string[] = []
  if (body.position) lines.push(`Position: ${body.position}`)
  if (body.experience) lines.push(`Experience: ${body.experience}`)
  if (body.license) lines.push(`License: ${body.license}`)
  if (body.availability) lines.push(`Availability: ${body.availability}`)
  if (body.location) lines.push(`Location: ${body.location}`)
  if (body.message) lines.push('', body.message.trim())
  return lines.join('\n').trim()
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromHeaders()
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found for this host' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = await rateLimitDb(`contact:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please wait a few minutes.' }, { status: 429 })
    }

    const body = (await request.json()) as ContactBody
    const name = body.name?.trim()
    const email = body.email?.trim().toLowerCase()
    const phone = body.phone?.trim()

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const formType = inferFormType(body)

    // ─── job-application branch ───
    if (formType === 'job-application') {
      const notes = buildJobNotes(body)
      const { data: app, error } = await supabaseAdmin
        .from('team_applications')
        .insert({
          tenant_id: tenant.id,
          name,
          email: email || null,
          phone: phone.replace(/\D/g, ''),
          address: body.location || null,
          experience: body.experience || null,
          availability: body.availability || null,
          notes,
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error

      await notify({
        tenantId: tenant.id,
        type: 'cleaner_application',
        title: 'New Team Application',
        message: `${name} • ${body.position || 'general'} • ${body.experience || '?'} yrs`,
      })

      try {
        const adminUrl = `${tenantSiteUrl(tenant)}/admin/team/applications`
        const subject = `[${tenant.name}] New team application: ${name}`
        const html = `<h2>New Team Application</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email || '—'}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          ${notes ? `<pre style="white-space:pre-wrap;font-family:inherit">${notes}</pre>` : ''}
          <p><a href="${adminUrl}">View in admin</a></p>`
        await emailAdmins(tenant, subject, html)
      } catch (emailErr) {
        console.error('[api/contact] job-app email error:', emailErr)
      }

      return NextResponse.json({ success: true, application_id: app.id })
    }

    // ─── lead branch (service-quote / general-inquiry) ───
    const notes = buildLeadNotes(formType, body)
    const address = body.address?.trim() || null
    // Online self-book leads are tagged so the $10 discount is traceable and
    // can be applied at quote time. Non-self-book leads keep prior behavior
    // (clients.source stays null; portal_leads.source stays the form type).
    const clientSource = body.selfBook ? 'website-selfbook' : null
    const leadSource = body.selfBook ? 'website-selfbook' : formType

    const cleanPhone = phone.replace(/\D/g, '')
    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id')
      .eq('tenant_id', tenant.id)
      .ilike('phone', `%${cleanPhone.slice(-10)}%`)
      .limit(1)

    let clientId: string

    if (existing && existing.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('clients')
        .update({
          name,
          email: email || null,
          ...(address ? { address } : {}),
          ...(body.selfBook ? { source: leadSource } : {}),
          notes,
          active: true,
          status: 'active',
        })
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
          email: email || null,
          phone,
          address,
          source: clientSource,
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
        email: email || null,
        phone,
        notes,
        source: leadSource,
        client_id: clientId,
      })
      .then(() => {}, () => {})

    // ─── enter the sales pipeline ───
    // A web lead must become a DEAL so it can walk new → qualifying → quoted →
    // sold/lost in the Sales workspace. One continuous record: if this client
    // already has an OPEN deal, we append the new submission as a note activity
    // instead of creating a duplicate. Non-blocking — a form submit never fails
    // on a pipeline error (the client/portal_lead is already saved).
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
        // Existing live deal — log the resubmission onto its timeline.
        await supabaseAdmin.from('deal_activities').insert({
          tenant_id: tenant.id,
          deal_id: openDeal.id,
          type: 'note',
          description: `New web submission [${formType}]${notes ? `\n${notes}` : ''}`,
          metadata: { source: leadSource, form_type: formType },
        })
        await supabaseAdmin
          .from('deals')
          .update({ last_activity_at: nowIso })
          .eq('id', openDeal.id)
          .eq('tenant_id', tenant.id)
      } else {
        // New deal at the front of the pipeline, seeded with the capture note.
        const { data: newDeal } = await supabaseAdmin
          .from('deals')
          .insert({
            tenant_id: tenant.id,
            client_id: clientId,
            title: body.pestType || body.subject || 'New lead',
            stage: 'new',
            mode: 'sales',
            value_cents: 0,
            probability: 10,
            source: leadSource,
            notes: notes || null,
            status: 'active',
            last_activity_at: nowIso,
          })
          .select('id')
          .single()
        if (newDeal) {
          await supabaseAdmin.from('deal_activities').insert({
            tenant_id: tenant.id,
            deal_id: newDeal.id,
            type: 'note',
            description: `Lead captured via web form [${formType}]${notes ? `\n${notes}` : ''}`,
            metadata: { source: leadSource, form_type: formType, self_book: !!body.selfBook },
          })
        }
      }
    } catch (dealErr) {
      console.error('[api/contact] pipeline deal error (non-blocking):', dealErr)
    }

    await notify({
      tenantId: tenant.id,
      type: 'new_client',
      title: 'New Lead from Contact Form',
      message: `${name} • ${formType}`,
    })

    try {
      const adminUrl = `${tenantSiteUrl(tenant)}/admin/clients`
      const msg = adminNewClientEmail(
        {
          name,
          phone,
          email,
          address: address || undefined,
          notes: notes || undefined,
          selfBookDiscountCents: body.selfBook ? 1000 : undefined,
        },
        {
          tenantName: tenant.name,
          primaryColor: tenant.primary_color || undefined,
          logoUrl: tenant.logo_url || undefined,
          adminUrl,
        },
      )
      await emailAdmins(tenant, msg.subject, msg.html)
    } catch (emailErr) {
      console.error('[api/contact] lead email error:', emailErr)
    }

    return NextResponse.json({ success: true, client_id: clientId })
  } catch (err) {
    console.error('[api/contact] error:', err)
    await trackError(err, { source: 'api/contact', severity: 'high' }).catch(() => {})
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
