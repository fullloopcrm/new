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
 * Job applications write to cleaner_applications (per migration
 * 2026_05_19_cleaner_applications). Admin notification goes through
 * emailAdmins which reads tenant.resend_api_key.
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
  message?: string
  subject?: string
  session_id?: string
  // service-quote
  pestType?: string
  propertyType?: string
  location?: string
  urgency?: string
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

function buildLeadNotes(form: string, body: ContactBody): string {
  const lines: string[] = [`[${form}]`]
  if (body.pestType) lines.push(`Pest: ${body.pestType}`)
  if (body.propertyType) lines.push(`Property: ${body.propertyType}`)
  if (body.urgency) lines.push(`Urgency: ${body.urgency}`)
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
        .from('cleaner_applications')
        .insert({
          tenant_id: tenant.id,
          name,
          email: email || null,
          phone,
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
        source: formType,
        client_id: clientId,
      })
      .then(() => {}, () => {})

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
          notes: notes || undefined,
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
