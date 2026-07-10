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
import { sendEmail } from '@/lib/email'
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
  // TCPA: customer affirmatively opted in to receive text messages at submit
  smsConsent?: boolean
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

// Self-book online discount + customer confirmation are per-tenant DATA
// (selena_config), never forked code. Defaults preserve prior behavior: $10
// discount, no customer email. One global code path; tenants differ by config.
type TenantConfigLike = { selena_config?: Record<string, unknown> | null }

function selfBookDiscountCents(tenant: TenantConfigLike): number {
  const cfg = (tenant.selena_config ?? {}) as Record<string, unknown>
  const raw = Number(cfg.self_book_discount_cents)
  return Number.isFinite(raw) && raw > 0 ? raw : 1000
}

function leadConfirmationEnabled(tenant: TenantConfigLike): boolean {
  const cfg = (tenant.selena_config ?? {}) as Record<string, unknown>
  return cfg.lead_confirmation_enabled === true
}

// Branded confirmation email sent to the customer/applicant (not the admin).
// Uses the tenant's own Resend key + brand color so it lands on-brand.
function customerConfirmationHtml(opts: {
  tenantName: string
  primaryColor?: string | null
  heading: string
  intro: string
  discountCents?: number
  businessAddress?: string | null
}): string {
  const color = opts.primaryColor || '#111111'
  // CAN-SPAM: include the sender's valid physical postal address when known.
  const addressBlock = opts.businessAddress
    ? `<p style="font-size:12px;color:#999;margin:12px 0 0">${opts.tenantName} · ${opts.businessAddress}</p>`
    : ''
  const discountBlock = opts.discountCents
    ? `<p style="margin:16px 0;padding:12px 16px;background:#f4faf6;border-radius:8px;font-size:15px">
         You booked online, so <strong>$${Math.round(opts.discountCents / 100)} off your service</strong> will be applied to your appointment.
       </p>`
    : ''
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#1a1a1a">
    <h2 style="color:${color};margin:0 0 12px">${opts.heading}</h2>
    <p style="font-size:15px;line-height:1.5;margin:0 0 12px">${opts.intro}</p>
    ${discountBlock}
    <p style="font-size:14px;color:#555;margin:16px 0 0">— The ${opts.tenantName} team</p>
    ${addressBlock}
  </div>`
}

function buildLeadNotes(form: string, body: ContactBody, discountCents: number): string {
  const lines: string[] = [`[${form}]`]
  if (body.smsConsent) lines.push(`✅ SMS consent granted (TCPA) at ${new Date().toISOString()}`)
  if (body.selfBook) lines.push(`💲 SELF-BOOK ONLINE — apply $${Math.round(discountCents / 100)} off the service`)
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

    // Require a name + at least one way to reach them. Home-services forms send
    // a phone; email-first marketing forms may send only an email — both valid.
    if (!name || (!phone && !email)) {
      return NextResponse.json({ error: 'Name and a phone or email are required' }, { status: 400 })
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
          phone: (phone || '').replace(/\D/g, ''),
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

      // Applicant confirmation — per-tenant opt-in, non-blocking.
      if (email && leadConfirmationEnabled(tenant)) {
        try {
          await sendEmail({
            to: email,
            from: (tenant as { email_from?: string | null }).email_from || undefined,
            resendApiKey: tenant.resend_api_key,
            subject: `We received your application — ${tenant.name}`,
            html: customerConfirmationHtml({
              tenantName: tenant.name,
              primaryColor: tenant.primary_color,
              heading: `Thanks for applying, ${name.split(' ')[0]}!`,
              intro: `We received your application${body.position ? ` for ${body.position}` : ''} and our team will review it and follow up soon.`,
              businessAddress: (tenant as { address?: string | null }).address ?? undefined,
            }),
          })
        } catch (custErr) {
          console.error('[api/contact] applicant confirmation error:', custErr)
        }
      }

      return NextResponse.json({ success: true, application_id: app.id })
    }

    // ─── lead branch (service-quote / general-inquiry) ───
    const discountCents = selfBookDiscountCents(tenant)
    const notes = buildLeadNotes(formType, body, discountCents)
    const address = body.address?.trim() || null
    // Online self-book leads are tagged so the $10 discount is traceable and
    // can be applied at quote time. Non-self-book leads keep prior behavior
    // (clients.source stays null; portal_leads.source stays the form type).
    const clientSource = body.selfBook ? 'website-selfbook' : null
    const leadSource = body.selfBook ? 'website-selfbook' : formType

    // Dedup against an existing client by phone when we have one, else by email
    // (email-only marketing leads). No contact match → treated as new.
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
    let existing: { id: string }[] | null = null
    if (cleanPhone) {
      const r = await supabaseAdmin
        .from('clients').select('id').eq('tenant_id', tenant.id)
        .ilike('phone', `%${cleanPhone.slice(-10)}%`).limit(1)
      existing = r.data
    } else if (email) {
      const r = await supabaseAdmin
        .from('clients').select('id').eq('tenant_id', tenant.id)
        .eq('email', email).limit(1)
      existing = r.data
    }

    let clientId: string

    if (existing && existing.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('clients') // tenant-scope-ok: update is scoped by .eq('tenant_id', tenant.id) below
        .update({
          name,
          email: email || null,
          ...(address ? { address } : {}),
          ...(body.selfBook ? { source: leadSource } : {}),
          // Only ever UPGRADE consent — a returning lead who now opts in becomes
          // marketing-textable; we never silently downgrade an existing consent.
          ...(body.smsConsent ? { sms_consent: true } : {}),
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
          phone: phone || null,
          address,
          source: clientSource,
          // Express-consent going forward: a brand-new lead is marketing-textable
          // only if they affirmatively opted in on the form. (Existing clients
          // keep their prior value and are unaffected.)
          sms_consent: !!body.smsConsent,
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
          selfBookDiscountCents: body.selfBook ? discountCents : undefined,
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

    // Customer confirmation — per-tenant opt-in. Non-blocking: a failed
    // confirmation must never fail the lead capture (already saved above).
    if (email && leadConfirmationEnabled(tenant)) {
      try {
        await sendEmail({
          to: email,
          from: (tenant as { email_from?: string | null }).email_from || undefined,
          resendApiKey: tenant.resend_api_key,
          subject: `We got your request — ${tenant.name}`,
          html: customerConfirmationHtml({
            tenantName: tenant.name,
            primaryColor: tenant.primary_color,
            heading: `Thanks, ${name.split(' ')[0]}!`,
            intro: `We received your request and a team member will reach out shortly to confirm the details and your time.`,
            discountCents: body.selfBook ? discountCents : undefined,
            businessAddress: (tenant as { address?: string | null }).address ?? undefined,
          }),
        })
      } catch (custErr) {
        console.error('[api/contact] customer confirmation error:', custErr)
      }
    }

    return NextResponse.json({ success: true, client_id: clientId })
  } catch (err) {
    console.error('[api/contact] error:', err)
    await trackError(err, { source: 'api/contact', severity: 'high' }).catch(() => {})
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
