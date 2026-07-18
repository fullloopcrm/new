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
import { sendEmail } from '@/lib/email'
import { emailShell } from '@/lib/messaging/shell'
import { isCommEnabled } from '@/lib/comms-prefs'
import { escapeHtml } from '@/lib/escape-html'
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

// Escape LIKE/ILIKE wildcards so the dedup lookup only ever matches the
// literal name (Postgres default LIKE escape char is backslash). Same
// pattern already fixed on /api/referrers, /api/client/check, /api/pin-reset,
// /api/ingest/application.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

// Unauthenticated route — a public caller controls both `name` and every
// arbitrary key folded into notes below. Cap both so a single request can't
// balloon a client record (or, downstream, an admin SMS built from it in
// bookings/team-assignment flows — see smsJobAssignment/smsLateCheckInAdmin)
// to megabytes of attacker-chosen content. Mirrors the authenticated
// /api/clients name cap (200) and the /api/prospects/waitlist notes cap (2000).
const MAX_NAME = 200
const MAX_NOTES = 2000

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
  return combined ? combined.slice(0, MAX_NOTES) : null
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
    const name = body.name?.trim().slice(0, MAX_NAME)
    const email = body.email?.trim().toLowerCase() || null
    const phoneRaw = body.phone?.trim() || ''
    const notes = buildLeadNotes(body)

    if (!name || (!email && !phoneRaw)) {
      return NextResponse.json({ error: 'Name and a phone or email are required.' }, { status: 400 })
    }

    // Job applications are NOT sales leads. Route them to team_applications
    // (Team → Applications) instead of creating a client + sales deal, so the
    // structured answers land as an application, not a customer record. Applies
    // to every tenant job form that posts { type: 'job-application' }.
    if (body.type === 'job-application') {
      const appPhone = phoneRaw.replace(/\D/g, '')
      try {
        if (appPhone) {
          const { data: dupe } = await supabaseAdmin
            .from('team_applications')
            .select('id')
            .eq('tenant_id', tenant.id)
            .eq('phone', appPhone)
            .ilike('name', escapeLike(name))
            .limit(1)
            .maybeSingle()
          if (dupe) return NextResponse.json({ success: true, application_id: dupe.id, deduped: true })
        }

        const { data: appRow, error: appErr } = await supabaseAdmin
          .from('team_applications')
          .insert({
            tenant_id: tenant.id,
            name,
            email,
            phone: appPhone || null,
            availability: (body.availability as string) || null,
            referral_source: (body.source as string) || null,
            notes,
            status: 'pending',
          })
          .select('id')
          .single()
        if (appErr) throw appErr

        await notify({
          tenantId: tenant.id,
          type: 'cleaner_application',
          title: 'New Team Application',
          message: `${name}${phoneRaw ? ' • ' + phoneRaw : ''}`,
        }).catch((err) => console.error('[api/lead] application notify error:', err))

        // Email the tenant's admins too (mirrors /api/contact). notify() alone
        // only fires when an owner tenant_member has an email; emailAdmins also
        // falls back to tenant.email, so job-application alerts reach the inbox
        // even for tenants with no member rows. Non-blocking.
        try {
          const adminUrl = `${tenantSiteUrl(tenant)}/admin/team/applications`
          const subject = `[${tenant.name}] New job application: ${name}`
          const html = `<h2>New Job Application</h2>
            <p><strong>Name:</strong> ${escapeHtml(name)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email || '—')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(phoneRaw || '—')}</p>
            ${notes ? `<pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(notes)}</pre>` : ''}
            <p><a href="${adminUrl}">View in admin</a></p>`
          await emailAdmins(tenant, subject, html)
        } catch (emailErr) {
          console.error('[api/lead] job-app email error:', emailErr)
        }

        // Applicant confirmation — same acknowledgement toggle as leads
        // (lead_received). Sent from the tenant's own from-address. Non-blocking.
        try {
          if (email && (await isCommEnabled(tenant.id, 'lead_received', 'email'))) {
            const t = tenant as Record<string, unknown>
            const html = emailShell({
              brand: {
                name: tenant.name,
                phone: (t.phone as string) || null,
                email: (t.email as string) || null,
                address: (t.address as string) || null,
                logoUrl: tenant.logo_url || null,
                primaryColor: tenant.primary_color || null,
              },
              heading: `Thanks for applying, ${name.split(' ')[0]}`,
              bodyHtml: `<p>We received your application and our team will review it and follow up shortly. If you need to reach us, just reply to this email${t.phone ? ` or call ${t.phone}` : ''}.</p>`,
              preheader: `We received your application`,
            })
            await sendEmail({
              to: email,
              subject: `We received your application — ${tenant.name}`,
              html,
              resendApiKey: (t.resend_api_key as string) || undefined,
              from: (t.email_from as string) || undefined,
            })
          }
        } catch (ackErr) {
          console.error('[api/lead] applicant confirmation error:', ackErr)
        }

        return NextResponse.json({ success: true, application_id: appRow.id })
      } catch (appErr) {
        console.error('[api/lead] application insert failed:', appErr)
        await trackError(appErr, { source: 'api/lead:application', severity: 'high' }).catch(() => {})
        return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
      }
    }

    const cleanPhone = phoneRaw.replace(/\D/g, '')
    const phone = phoneRaw || null
    let clientId: string

    // Dedupe by phone only when we have a full national number. Exact match
    // only (no ilike substring) — the prior 7-digit floor still let a
    // malformed/short phone substring-match an unrelated client, whose
    // name/email/notes then get overwritten below with attacker-supplied
    // data on this unauthenticated public form.
    const nat = (d: string) => (d.length === 11 && d.startsWith('1') ? d.slice(1) : d)
    let existing: { id: string; email: string | null }[] | null = null
    if (cleanPhone.length >= 10) {
      const target = nat(cleanPhone)
      const { data: candidates } = await supabaseAdmin
        .from('clients')
        .select('id, phone, email')
        .eq('tenant_id', tenant.id)
      const match = (candidates || []).find(c => {
        const cDigits = nat((c.phone || '').replace(/\D/g, ''))
        return cDigits.length >= 10 && cDigits === target
      })
      existing = match ? [{ id: match.id, email: match.email ?? null }] : []
    }

    if (existing && existing.length > 0) {
      const { data: updated, error } = await supabaseAdmin
        .from('clients')
        .update({
          name,
          // Never overwrite an email already on file via this unauthenticated
          // form — clients.email doubles as the client-portal login
          // identifier (/api/client/verify-code matches by phone, then by
          // email), so letting a phone match reassign it would let anyone
          // who merely knows a client's phone number redirect their login
          // email to an address they control and hijack the account.
          ...(existing[0].email ? {} : { email }),
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
            description: `Lead captured via web form [${leadSource}]${notes ? `\n${notes}` : ''}`,
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

    // Client acknowledgement — auto-reply to the submitter (gated by lead_received email).
    try {
      if (email && (await isCommEnabled(tenant.id, 'lead_received', 'email'))) {
        const t = tenant as Record<string, unknown>
        const html = emailShell({
          brand: {
            name: tenant.name,
            phone: (t.phone as string) || null,
            email: (t.email as string) || null,
            address: (t.address as string) || null,
            logoUrl: tenant.logo_url || null,
            primaryColor: tenant.primary_color || null,
          },
          heading: `Thanks, ${name.split(' ')[0]}`,
          bodyHtml: `<p>We received your request and will be in touch shortly. If it's urgent, just reply to this email${t.phone ? ` or call ${t.phone}` : ''}.</p>`,
          preheader: `We received your message`,
        })
        await sendEmail({
          to: email,
          subject: `We got your message — ${tenant.name}`,
          html,
          resendApiKey: (t.resend_api_key as string) || undefined,
          from: (t.email_from as string) || undefined,
        })
      }
    } catch (ackErr) {
      console.error('[api/lead] client ack email error:', ackErr)
    }

    return NextResponse.json({ success: true, client_id: clientId })
  } catch (err) {
    console.error('[api/lead] error:', err)
    await trackError(err, { source: 'api/lead', severity: 'high' }).catch(() => {})
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
