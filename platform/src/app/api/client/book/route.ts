import { NextResponse } from 'next/server'
import { tenantDb } from '@/lib/tenant-db'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { notify, buildBookingConfirmationEmail } from '@/lib/notify'
import { isCommEnabled } from '@/lib/comms-prefs'
import { emailAdmins } from '@/lib/admin-contacts'
import { applyRecurringDiscount } from '@/lib/nycmaid/recurring-discount'
import {
  adminNewBookingRequestEmail,
  referralSignupNotifyEmail,
} from '@/lib/email-templates'
import { bookingReceivedEmail } from '@/lib/messaging/client-email'
import { clientSmsTemplates } from '@/lib/messaging/client-sms'
import { sendClientEmail } from '@/lib/client-contacts'
import { teamSmsTemplatesFor } from '@/lib/messaging/team-sms-resolver'
import { autoAttributeBooking } from '@/lib/attribution'
import { resolveProperty, applyPropertyToBookingClient } from '@/lib/client-properties'
import { scoreTeamForBooking, pickBestTeam } from '@/lib/smart-schedule'
import { notifyTeamMember, formatDeliveryReport } from '@/lib/notify-team'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getSettings } from '@/lib/settings'
import { trackError } from '@/lib/error-tracking'
import { labelToHour } from '@/lib/time-slots'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeLikeValue } from '@/lib/postgrest-safe'
import { createPrimaryContact } from '@/lib/client-contacts'
import { formatName } from '@/lib/format'
import { normalizePhone } from '@/lib/phone'
import { sanitizeInput } from '@/lib/sanitize'
import { randomInt, randomBytes } from 'crypto'
import { audit } from '@/lib/audit'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { isWeekendDate, WEEKEND_CLIENT_SUPPLIES_RATE, WEEKEND_SUPPLIES_PROVIDED_RATE, WEEKEND_EMERGENCY_RATE } from '@/lib/nycmaid/weekend-pricing'
import { SELF_BOOKING_DISCOUNT_DOLLARS } from '@/lib/nycmaid/self-book-discount'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'
import { SERVICE_PRESETS, type IndustryKey } from '@/lib/industry-presets'
import { isValidLeadSource } from '@/lib/lead-sources'
import { syncComhubContactName } from '@/lib/comhub-contact-sync'
import { getSmsConsentText, smsOptInFields } from '@/lib/sms-consent'
import { getTenantTimezone } from '@/lib/tenant-time'

/** Trade-neutral fallback when no service_type is supplied — the tenant's own
 * first-ranked preset for its industry, not a hardcoded cleaning term. */
function defaultServiceType(industry: string | null | undefined): string {
  return SERVICE_PRESETS[(industry as IndustryKey) || 'general']?.[0]?.name
    || SERVICE_PRESETS.general[0].name
}

function generateCleanerToken(): string {
  return randomBytes(24).toString('base64url')
}

function templateData(tenant: { name: string; primary_color?: string | null; logo_url?: string | null }) {
  return {
    tenantName: tenant.name,
    primaryColor: tenant.primary_color || undefined,
    logoUrl: tenant.logo_url || undefined,
  }
}

type AutoAssignedBooking = {
  id: string
  start_time: string
  end_time?: string | null
  hourly_rate?: number | null
  clients?: { id?: string | null; name?: string | null; phone?: string | null; address?: string | null; email?: string | null } | null
  team_members?: { name?: string | null; phone?: string | null; pin?: string | null } | null
}

/**
 * Auto-booking replays the same client-confirmation + team-member-assignment SMS
 * a manual dashboard assignment triggers (see PUT /api/bookings/[id] and the
 * Paul Oberbeck / nycmaid 8e1e4cf2 incident that block's own comments
 * reference) — this route is public/unauthenticated and can't call that
 * permission-gated endpoint directly. Then sends the admin heads-up: Telegram
 * if the tenant has a bot configured, otherwise email (notify()'s
 * TELEGRAM_NOTIFY_TYPES routing ladder).
 */
async function notifyAutoAssignment(
  tenant: Awaited<ReturnType<typeof getTenantFromHeaders>>,
  booking: AutoAssignedBooking,
  team: { size: number; assignedCount: number },
): Promise<void> {
  if (!tenant) return
  const date = new Date(booking.start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const time = new Date(booking.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  const hasSMS = !!(tenant.telnyx_api_key && tenant.telnyx_phone)

  if (booking.clients?.id) {
    try {
      const html = await buildBookingConfirmationEmail(tenant.id, booking.id, {
        clientName: booking.clients.name || 'there',
        serviceName: 'Appointment',
        dateTime: `${date} at ${time}`,
      })
      await sendClientEmail(tenant, booking.clients.id, `Booking Confirmed — ${date}`, html)
    } catch (err) {
      console.error('[client/book] auto-assign client confirmation email error:', err)
    }
  }
  if (booking.clients?.phone && hasSMS && (await isCommEnabled(tenant.id, 'booking_confirmed', 'sms'))) {
    sendSMS({
      to: booking.clients.phone,
      body: clientSmsTemplates(tenant).bookingConfirmation({
        start_time: booking.start_time,
        hourly_rate: booking.hourly_rate,
        team_members: booking.team_members,
      }),
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch((err) => console.error('[client/book] auto-assign confirmation SMS error:', err))
  }

  if (booking.team_members?.phone && hasSMS && (await isCommEnabled(tenant.id, 'team_assignment', 'sms'))) {
    const templates = await teamSmsTemplatesFor(tenant.id)
    sendSMS({
      to: booking.team_members.phone,
      body: templates.jobAssignment({
        start_time: booking.start_time,
        hourly_rate: booking.hourly_rate,
        clients: booking.clients,
        team_members: booking.team_members,
      }),
      telnyxApiKey: tenant.telnyx_api_key,
      telnyxPhone: tenant.telnyx_phone,
    }).catch((err) => console.error('[client/book] auto-assign job SMS error:', err))
  }

  // team.assignedCount < team.size means this job needed more cleaners than
  // were available/conflict-free at commit time (see pickBestTeam's `short`)
  // — flagged explicitly here rather than folded into the same "assigned to
  // X" phrasing every fully-staffed job gets, so a short-staffed multi-cleaner
  // job doesn't read as routine success. Real incident: a 2-cleaner NYC Maid
  // booking auto-assigned only the lead and sat understaffed for ~2.5 hours
  // until a human noticed and manually added the second cleaner.
  const isShortStaffed = team.assignedCount < team.size
  const staffingNote = team.size > 1
    ? isShortStaffed
      ? ` ⚠️ SHORT-STAFFED: only ${team.assignedCount} of ${team.size} needed cleaners could be auto-assigned — needs a manual add.`
      : ` Team of ${team.size} fully assigned.`
    : ''
  await notify({
    tenantId: tenant.id,
    type: 'auto_booking_assigned',
    title: isShortStaffed ? 'Booking Auto-Assigned — SHORT-STAFFED' : 'Booking Auto-Assigned',
    message: `${booking.clients?.name || 'A client'}'s booking for ${date} at ${time} was automatically assigned to ${booking.team_members?.name || 'a team member'}.${staffingNote} It's SCHEDULED — live on the calendar, not pending.`,
    booking_id: booking.id,
  }).catch((err) => console.error('[client/book] auto-assign admin notify error:', err))
}

/**
 * Notify each non-lead team member added to an auto-assigned multi-cleaner
 * booking. Mirrors PUT /api/bookings/[id]/team's extras-notification path —
 * the lead's confirmation/job SMS is handled by notifyAutoAssignment above,
 * same division of labor as the manual team-assignment endpoint.
 */
async function notifyExtraTeamMembers(
  tenant: Awaited<ReturnType<typeof getTenantFromHeaders>>,
  tenantId: string,
  bookingId: string,
  clientName: string,
  startTimeISO: string,
  hourlyRate: number | null | undefined,
  extraIds: string[],
): Promise<void> {
  if (!tenant || extraIds.length === 0) return
  const bookingDate = new Date(startTimeISO).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const templates = await teamSmsTemplatesFor(tenantId)

  for (const extraId of extraIds) {
    try {
      const { data: extraMember } = await supabaseAdmin
        .from('team_members')
        .select('name, pin')
        .eq('id', extraId)
        .single<{ name: string | null; pin: string | null }>()

      const report = await notifyTeamMember({
        tenantId,
        teamMemberId: extraId,
        type: 'job_assignment',
        title: 'Added to Team Job',
        message: `${clientName} on ${bookingDate} (auto-assigned team)`,
        bookingId,
        smsMessage: templates.jobAssignment({
          start_time: startTimeISO,
          hourly_rate: hourlyRate,
          clients: { name: clientName },
          team_members: extraMember ? { name: extraMember.name, pin: extraMember.pin } : null,
        }),
        skipEmail: true,
      })

      await supabaseAdmin.from('notifications').insert({
        tenant_id: tenantId,
        type: 'team_member_notified',
        title: 'Team Member Notified',
        message: `${report.teamMemberName}: ${formatDeliveryReport(report)}`,
        booking_id: bookingId,
      })
    } catch (err) {
      console.error('[client/book] auto-assign extra team member notify error:', err)
    }
  }
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`client-book:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
    if (!rl.allowed) {
      // 'low' severity: this is routine abuse-prevention, not a bug — logged
      // (not alerted) purely so a client's "kept failing then worked" report
      // is diagnosable later instead of leaving zero trace, which is what
      // happened investigating the Sara Davis / nycmaid 2026-08-01 report.
      await trackError(new Error('rate limited'), { source: 'client/book:rate_limited', tenantId: tenant.id, severity: 'low', extra: ip, alwaysAlert: true })
      return NextResponse.json({ error: 'Too many booking attempts. Please wait a few minutes.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>
    const smsOptedIn = body.sms_opt_in === true
    const userAgent = typeof body.user_agent === 'string' ? body.user_agent : 'unknown'
    const consentText = getSmsConsentText(tenant as { id: string; name: string })
    if (typeof body.notes === 'string') {
      body.notes = sanitizeInput(body.notes)
    }
    if (typeof body.address === 'string') {
      body.address = sanitizeInput(body.address)
    }
    if (typeof body.unit === 'string') {
      body.unit = sanitizeInput(body.unit)
    }

    if (!body.client_id && !body.email && !body.phone) {
      await trackError(new Error('missing client_id/email/phone'), { source: 'client/book:missing_contact', tenantId: tenant.id, severity: 'low', extra: ip, alwaysAlert: true })
      return NextResponse.json({ error: 'Client ID, email, or phone is required' }, { status: 400 })
    }

    // body.client_id is caller-supplied and wholly unauthenticated (this is the
    // public new/returning-customer booking form) — clients has no cross-tenant
    // FK check, so a foreign id was previously accepted verbatim: create_booking_
    // atomic's ownership PERFORM doesn't reject a no-match, and the read-back
    // below embeds clients(*) unscoped, so another tenant's client PII (name/
    // phone/email/address) would return in this response, and the confirmation
    // email/SMS a few lines down would be sent to THAT client, not the caller.
    // Verify ownership up front — 404 before any booking work runs — which also
    // covers the do-not-service gate below.
    if (body.client_id) {
      const { data: ownedClient } = await supabaseAdmin
        .from('clients')
        .select('do_not_service')
        .eq('id', body.client_id as string)
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      if (!ownedClient) {
        await trackError(new Error('client_id not found for tenant'), { source: 'client/book:client_not_found', tenantId: tenant.id, severity: 'low', extra: body.client_id as string, alwaysAlert: true })
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      if (ownedClient.do_not_service) {
        await trackError(new Error('do_not_service client attempted booking'), { source: 'client/book:do_not_service', tenantId: tenant.id, severity: 'low', extra: body.client_id as string, alwaysAlert: true })
        const contactPhone = tenant.phone || ''
        return NextResponse.json({
          error: `Please contact us${contactPhone ? ` at ${contactPhone}` : ''} to schedule your next service.`,
        }, { status: 403 })
      }
    }

    let clientId = body.client_id as string | undefined
    let isNewClient = false

    if (!clientId && body.email) {
      const phone = normalizePhone(body.phone as string | undefined) || ''
      const emailLower = (body.email as string).toLowerCase()
      const clientName = formatName(body.name as string)

      let matchedClient: { id: string; name: string | null; phone: string | null; do_not_service: boolean | null } | null = null

      const { data: byEmail } = await tenantDb(tenant.id)
        .from('clients')
        .select('id, name, phone, do_not_service')
        .eq('tenant_id', tenant.id)
        .ilike('email', escapeLikeValue(emailLower))
        .maybeSingle()
      if (byEmail) { clientId = byEmail.id; matchedClient = byEmail }

      if (!clientId && phone) {
        const { data: byPhone } = await tenantDb(tenant.id)
          .from('clients')
          .select('id, name, phone, do_not_service')
          .eq('phone', phone)
          .maybeSingle()
        if (byPhone) { clientId = byPhone.id; matchedClient = byPhone }
      }

      // Guest checkout (no client_id cookie/session) matches an existing
      // client by email/phone above -- without this, a DNS'd client could
      // bypass the do_not_service gate above entirely just by submitting the
      // booking form logged out instead of logged in. Same rejection as the
      // known-client_id path.
      if (matchedClient?.do_not_service) {
        await trackError(new Error('do_not_service client attempted guest booking'), { source: 'client/book:do_not_service_guest', tenantId: tenant.id, severity: 'low', extra: matchedClient.id, alwaysAlert: true })
        const contactPhone = tenant.phone || ''
        return NextResponse.json({
          error: `Please contact us${contactPhone ? ` at ${contactPhone}` : ''} to schedule your next service.`,
        }, { status: 403 })
      }

      // A client whose name is still exactly their own phone number is the
      // SMS-inbound placeholder ("we don't have a name yet, just save the
      // number so the thread has a record") -- see createLeadAndEnterPipeline
      // in the telnyx webhook. The booking form is the first time this
      // person hands us their real name; overwrite the placeholder outright.
      // Never touches a genuine existing name -- only fires when name is
      // literally the phone digits.
      if (matchedClient && clientName) {
        const storedDigits = (matchedClient.name || '').replace(/\D/g, '')
        const phoneDigits = (matchedClient.phone || '').replace(/\D/g, '')
        const isPlaceholderName = storedDigits.length >= 10 && storedDigits === phoneDigits
        if (isPlaceholderName) {
          await tenantDb(tenant.id)
            .from('clients')
            .update({ name: clientName })
            .eq('id', matchedClient.id)
        }
      }

      if (!clientId) {
        // Required for every direct-booking path that creates a client without
        // ever going through the deals pipeline (see lss-08 readiness finding,
        // 2026-08-01): 90% of real clients had zero lead-source record at all,
        // not just an unsold deal. Enforced here, not just in the form -- this
        // is an unauthenticated public endpoint, so a caller-supplied body
        // can't be trusted to have included it.
        if (!isValidLeadSource(body.lead_source)) {
          await trackError(new Error(`invalid lead_source: ${body.lead_source}`), { source: 'client/book:invalid_lead_source', tenantId: tenant.id, severity: 'low', alwaysAlert: true })
          return NextResponse.json({ error: 'lead_source is required and must be one of the known options' }, { status: 400 })
        }

        const { data: newClient, error: createErr } = await tenantDb(tenant.id)
          .from('clients')
          .insert({
            name: clientName,
            email: emailLower,
            phone: phone || null,
            address: (body.address as string) + (body.unit ? `, ${body.unit}` : ''),
            notes: (body.notes as string) || '',
            pin: String(100000 + randomInt(0, 900000)),
            source: body.lead_source as string,
            ...smsOptInFields(smsOptedIn, ip, userAgent, consentText),
          })
          .select()
          .single()
        if (createErr || !newClient) {
          await trackError(createErr || new Error('client insert returned no data'), { source: 'client/book:create_client_failed', tenantId: tenant.id, severity: 'high', alwaysAlert: true })
          return NextResponse.json({ error: `Failed to create client: ${createErr?.message}` }, { status: 500 })
        }
        clientId = newClient.id
        isNewClient = true
        // Required by every client-creation path (see createPrimaryContact's
        // own docstring) — without it, getClientContacts() returns empty
        // forever and this client's confirmation email/SMS silently no-ops
        // on every future send, no error, no trace. Missing here is exactly
        // what happened to nycmaid booking 8e1e4cf2 (Paul Oberbeck,
        // 2026-07-24): self-booked, zero client_contacts rows, confirmation
        // silently never sent.
        await createPrimaryContact(tenant.id, newClient.id, { name: clientName, phone, email: emailLower })
        await notify({
          tenantId: tenant.id,
          type: 'new_client',
          title: 'New Client (via Booking)',
          message: `${clientName} • ${emailLower}${phone ? ` • ${phone}` : ''}`,
        })
      }
    }

    // Whoever's booking just handed us their real name -- that should
    // replace whatever placeholder (usually nothing) ComHub has for them,
    // client-new or returning alike. Never block the booking on this.
    if (clientId && body.name) {
      await syncComhubContactName(tenant.id, {
        name: formatName(body.name as string),
        phone: normalizePhone(body.phone as string | undefined),
        email: (body.email as string) || null,
        clientId,
      }).catch((e) => console.error('[client/book] syncComhubContactName failed:', e))
    }

    // A returning client (matched by email/phone above, or booking with a
    // saved client_id) checking the box on THIS booking is a fresh consent
    // event — record it. isNewClient already got it in the insert above;
    // this only fires for existing rows, and only adds consent, never clears it.
    if (smsOptedIn && clientId && !isNewClient) {
      await tenantDb(tenant.id)
        .from('clients')
        .update(smsOptInFields(true, ip, userAgent, consentText))
        .eq('id', clientId)
        .eq('tenant_id', tenant.id)
    }

    // Referral resolution (tenant-scoped)
    let referrerId: string | null = null
    let referrerData: { id: string; name: string; email?: string | null } | null = null
    if (body.ref_code) {
      const { data: referrer } = await tenantDb(tenant.id)
        .from('referrers')
        .select('id, name, email')
        .eq('ref_code', (body.ref_code as string).toUpperCase())
        .eq('active', true)
        .maybeSingle()
      if (referrer) {
        referrerId = referrer.id
        referrerData = referrer
        if (clientId) {
          await tenantDb(tenant.id)
            .from('clients')
            .update({ referrer_id: referrerId })
            .eq('id', clientId)
            .is('referrer_id', null)
        }
      }
    }

    // Sales partner resolution — same ?ref= flow as referrers, separate
    // referral_code namespace, so only checked when no referrer matched.
    let salesPartnerId: string | null = null
    if (!referrerId && body.ref_code) {
      const { data: salesPartner } = await supabaseAdmin
        .from('sales_partners')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('referral_code', (body.ref_code as string).toUpperCase())
        .eq('active', true)
        .maybeSingle()
      if (salesPartner) {
        salesPartnerId = salesPartner.id
        if (clientId) {
          await supabaseAdmin
            .from('clients')
            .update({ sales_partner_id: salesPartnerId })
            .eq('id', clientId)
            .eq('tenant_id', tenant.id)
            .is('sales_partner_id', null)
        }
      }
    }

    // Time computation
    let startTime = body.start_time as string | undefined
    let endTime = body.end_time as string | undefined
    if (body.date && body.time && !startTime) {
      // Parse any slot label (incl. evening/24-7 slots), not just a fixed 9am-4pm map.
      // Slot labels come from hourToLabel (@/lib/time-slots) and are always
      // on the hour, so minute is always 0.
      const hour = labelToHour(body.time as string) ?? 9
      const minute = 0
      const duration = Number(body.estimated_hours) || 2
      const pad = (n: number) => n.toString().padStart(2, '0')
      startTime = `${body.date}T${pad(hour)}:${pad(minute)}:00`
      // A naive `pad(hour + duration)` produced an out-of-range hour (e.g.
      // "25:00:00") for any late-day slot with a multi-hour duration —
      // Postgres rejected the insert outright with "date/time field value
      // out of range", crashing the whole booking submission (live incident,
      // 2026-08-06/07, confirmed via error_logs). Route the end time through
      // Date so an overflow correctly rolls into the next calendar day
      // instead of producing an invalid timestamp string.
      const endDate = new Date(`${body.date}T${pad(hour)}:${pad(minute)}:00`)
      endDate.setHours(endDate.getHours() + duration)
      const endPad = (n: number) => String(n).padStart(2, '0')
      endTime = `${endDate.getFullYear()}-${endPad(endDate.getMonth() + 1)}-${endPad(endDate.getDate())}T${endPad(endDate.getHours())}:${endPad(endDate.getMinutes())}:00`
    }
    if (!startTime) {
      await trackError(new Error('missing start_time/date+time'), { source: 'client/book:missing_start_time', tenantId: tenant.id, severity: 'low', extra: ip, alwaysAlert: true })
      return NextResponse.json({ error: 'start_time or date+time required' }, { status: 400 })
    }

    const cleanerToken = generateCleanerToken()
    const tokenExpiresAt = new Date(startTime)
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

    // Holiday gate — skipped for open_365 / 24-7 tenants (emergency trades book
    // on holidays). Mirrors checkAvailability, which already exempts open_365.
    const settings = await getSettings(tenant.id)
    if (!settings.open_365) {
      const { isHoliday } = await import('@/lib/holidays')
      const holidayName = isHoliday(startTime.split('T')[0])
      if (holidayName) {
        await trackError(new Error(`booking rejected — closed for ${holidayName}`), { source: 'client/book:holiday_closed', tenantId: tenant.id, severity: 'low', alwaysAlert: true })
        return NextResponse.json({ error: `We're closed for ${holidayName}. Please choose another date.` }, { status: 400 })
      }
    }

    const bookingDate = startTime.split('T')[0]

    // ===== PRICING =====
    // This is a PUBLIC, unauthenticated endpoint — body.hourly_rate/body.price
    // are client-supplied and must never be trusted as-is. body.price used to
    // be accepted verbatim as a direct total override with no floor; no real
    // booking form actually sends it, so it's no longer trusted at all (always
    // derived server-side from rate × hours below). hourly_rate legitimately
    // varies per tenant (real observed rates: $49-$89/hr), so it's floored/
    // capped rather than pinned to one value.
    const MIN_HOURLY_RATE = 20
    const MAX_HOURLY_RATE = 200
    const rawHourlyRate = Number(body.hourly_rate)
    // Generic default; the NYC Maid tenant layers its supplies/emergency/
    // self-book rules on top (tenant-scoped parity, not global).
    let bkHourlyRate = Number.isFinite(rawHourlyRate) && rawHourlyRate > 0
      ? Math.min(MAX_HOURLY_RATE, Math.max(MIN_HOURLY_RATE, rawHourlyRate))
      : 75
    // Floored at 1hr — an unfloored fractional value (e.g. 0.001) would slip
    // past the hourly-rate clamp above and still yield a near-zero total.
    const bkEstimatedHours = Math.max(1, Number(body.estimated_hours) || 2)
    let bkPrice = applyRecurringDiscount(bkHourlyRate * bkEstimatedHours * 100, body.recurring_type === 'none' ? null : (body.recurring_type as string | undefined))
    let bkNotes = (body.notes as string) || ''
    const bkTeamSize = Math.max(1, Math.min(8, Number(body.team_size) || 1))
    let bkIsEmergency = false
    const bkMaxHours = typeof body.max_hours === 'number' && body.max_hours > 0 ? (body.max_hours as number) : null

    if (isNycMaid(tenant.id)) {
      // Emergency = same-day, OR a multi-cleaner booking under 48hr notice.
      // Emergency rate ($89) overrides the supplies-based rate ($59 client-
      // supplies / $69 we-bring). 2hr min (single) / 4hr min (2+ cleaners).
      // The self-booking promo (SELF_BOOKING_DISCOUNT_DOLLARS, applied at
      // billing in the 30-min alert) is suppressed for emergency +
      // multi-cleaner. Faithful port of NYC Maid.
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const isSameDay = bookingDate === todayET
      const hoursUntilBooking = (new Date(startTime).getTime() - Date.now()) / 3_600_000
      const isUnder48 = hoursUntilBooking < 48
      const isMultiCleaner = bkTeamSize >= 2
      bkIsEmergency = isSameDay || (isUnder48 && isMultiCleaner)
      // Weekend (Sat/Sun) surcharge — NEW clients only (Jeff, 2026-07-27).
      // isNewClient is only true above when no existing clients row matched
      // this booking's email/phone, so a returning client booking a weekend
      // slot falls through to the normal $59/$69/$89 tiers below, unchanged.
      const isWeekendBooking = isNewClient && isWeekendDate(bookingDate)
      // NYC Maid's only legitimate non-emergency rates are the published
      // supplies tiers for the applicable day. Anything else in the request
      // is rejected in favor of the higher (we-bring) default, closing the
      // direct "set hourly_rate=1" underpay exploit for this tenant precisely.
      const NYCMAID_VALID_RATES = isWeekendBooking
        ? new Set([WEEKEND_CLIENT_SUPPLIES_RATE, WEEKEND_SUPPLIES_PROVIDED_RATE])
        : new Set([59, 69])
      const emergencyRate = isWeekendBooking ? WEEKEND_EMERGENCY_RATE : 89
      const defaultRate = isWeekendBooking ? WEEKEND_SUPPLIES_PROVIDED_RATE : 69
      const effectiveRate = bkIsEmergency ? emergencyRate : (NYCMAID_VALID_RATES.has(rawHourlyRate) ? rawHourlyRate : defaultRate)
      const minHours = isMultiCleaner ? 4 : 2
      const billableHours = Math.max(Number(body.estimated_hours) || 2, minHours)
      bkHourlyRate = effectiveRate
      bkPrice = Math.round(effectiveRate * billableHours * bkTeamSize * 100)
      const discountEligible = !bkIsEmergency && !isMultiCleaner && !isWeekendBooking
      bkNotes = ((body.notes as string) || '') + (discountEligible
        ? `\n\n[Promo: $${SELF_BOOKING_DISCOUNT_DOLLARS} self-booking discount applies at billing]`
        : isMultiCleaner
          ? `\n\n[Multi-cleaner booking — no discount, 4-hour minimum${bkIsEmergency ? `, under-48hr emergency $${emergencyRate}/hr` : ''}]`
          : isWeekendBooking
            ? `\n\n[Weekend new-client rate — no discount, $${effectiveRate}/hr]`
            : '\n\n[Same-day emergency booking — no discount, $89/hr]')

      // Form-recap consent: when the client clicks Confirm in the recap modal we
      // record an audit line so the confirmation-reminder cron knows terms were
      // accepted at submit time and skips the CONFIRM-reply re-ask.
      if (body.client_confirmed === true) {
        const confirmedAt = typeof body.confirmed_at === 'string' ? body.confirmed_at : new Date().toISOString()
        const ua = typeof body.user_agent === 'string' ? (body.user_agent as string).slice(0, 200) : 'unknown'
        bkNotes += `\n\n[Client confirmed terms ${confirmedAt} from IP ${ip} via /book/new (UA: ${ua})]`
      }
    }

    // Resolve property (multi-address per client). Matches this booking's
    // address to an existing property for the client, or creates a new one. A
    // returning client booking a different address gets a NEW property — not a
    // duplicate client row. Address used everywhere downstream = property ??
    // client.address. Faithful port of the NYC Maid ind build.
    let propertyId: string | null = null
    if (clientId && body.address) {
      const property = await resolveProperty(clientId, body.address as string, (body.unit as string) || null)
      propertyId = property?.id || null
    }

    // Atomic create: the same-date duplicate check and the INSERT run inside
    // one supabaseAdmin.rpc('create_booking_atomic', ...) call — one DB
    // function (migrations/2026_07_13_client_book_dedupe_atomic.sql) that
    // locks the client row first, so a second concurrent submit always
    // recomputes the duplicate check against the first submit's
    // already-committed booking. Previously this was a SELECT count(*)
    // check followed by a separate INSERT — two concurrent submits (double-
    // click, slow-connection double-tap) could both read count=0 and both
    // pass before either INSERT landed, creating two bookings same-day.
    // Same naive-datetime boundary strings the old count check used (no tz
    // suffix — Postgres parses them in the session timezone, unchanged).
    const nextDayDate = new Date(`${bookingDate}T00:00:00Z`)
    nextDayDate.setUTCDate(nextDayDate.getUTCDate() + 1)
    const nextBookingDate = nextDayDate.toISOString().split('T')[0]
    const { data: claim, error: claimError } = await supabaseAdmin.rpc('create_booking_atomic', {
      p_tenant_id: tenant.id,
      p_client_id: clientId,
      p_property_id: propertyId,
      p_start_time: startTime,
      p_end_time: endTime,
      p_service_type: (body.service_type as string) || defaultServiceType(tenant.industry),
      p_price: bkPrice,
      p_hourly_rate: bkHourlyRate,
      p_team_size: bkTeamSize,
      p_is_emergency: bkIsEmergency,
      p_max_hours: bkMaxHours,
      p_notes: bkNotes,
      p_recurring_type: body.recurring_type === 'none' ? null : (body.recurring_type as string | undefined) || null,
      p_team_member_token: cleanerToken,
      p_token_expires_at: tokenExpiresAt.toISOString(),
      p_referrer_id: referrerId,
      p_ref_code: (body.ref_code as string) || null,
      p_day_start: `${bookingDate}T00:00:00`,
      p_day_end: `${nextBookingDate}T00:00:00`,
      p_active_statuses: ['scheduled', 'pending', 'confirmed', 'in_progress'],
      p_source: 'client_portal',
    })
    if (claimError) {
      await trackError(claimError, { source: 'client/book:create_booking_atomic', tenantId: tenant.id, severity: 'high', alwaysAlert: true })
      return NextResponse.json({ error: claimError.message }, { status: 500 })
    }
    if (!claim?.created) {
      if (claim?.reason === 'duplicate_date') {
        await trackError(new Error('duplicate_date on submit'), { source: 'client/book:duplicate_date', tenantId: tenant.id, severity: 'low', extra: clientId, alwaysAlert: true })
        return NextResponse.json({ error: 'You already have a booking on this date.' }, { status: 409 })
      }
      await trackError(new Error(`create_booking_atomic returned created:false, reason:${claim?.reason}`), { source: 'client/book:atomic_not_created', tenantId: tenant.id, severity: 'high', alwaysAlert: true })
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    // sales_partner_id isn't a param on create_booking_atomic (predates the
    // Sales Partner feature) -- set it in a small follow-up update rather
    // than widening the atomic RPC's surface. Not race-prone: unlike the
    // same-date dedup check, two concurrent submits can't both "win" a
    // sales-partner attribution the way they could a duplicate date.
    if (salesPartnerId) {
      await supabaseAdmin
        .from('bookings')
        .update({ sales_partner_id: salesPartnerId })
        .eq('id', claim.booking.id)
        .eq('tenant_id', tenant.id)
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(*), client_properties(*)')
      .eq('id', claim.booking.id)
      .eq('tenant_id', tenant.id)
      .single()
    if (error || !data) {
      // 23505 here means a concurrent request won the same-date race the
      // count check above can't close atomically (see
      // uq_bookings_client_same_date_active) — surface the same duplicate
      // error the pre-check gives, not a raw 500.
      if ((error as { code?: string } | null)?.code === '23505') {
        await trackError(new Error('duplicate_date race on post-claim fetch'), { source: 'client/book:duplicate_date_race', tenantId: tenant.id, severity: 'low', extra: clientId, alwaysAlert: true })
        return NextResponse.json({ error: 'You already have a booking on this date.' }, { status: 409 })
      }
      await trackError(error || new Error('post-claim booking fetch returned no data'), { source: 'client/book:post_claim_fetch', tenantId: tenant.id, severity: 'high', alwaysAlert: true })
      return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })
    }

    // Seed the notes thread with whatever the client typed at booking time —
    // this is the one place a booking's note history starts. Without this,
    // a client's initial note only ever lived in bookings.notes (a static
    // field the team portal read but couldn't reply to) while anything
    // added later went into booking_notes — two disconnected note trails
    // for the same booking. Fire-and-forget: never block booking creation
    // on the notes thread.
    if ((body.notes as string)?.trim()) {
      supabaseAdmin
        .from('booking_notes')
        .insert({
          tenant_id: tenant.id,
          booking_id: data.id,
          job_id: (data as { job_id?: string | null }).job_id ?? null,
          client_id: clientId,
          author_type: 'client',
          author_name: data.clients?.name || 'Client',
          content: (body.notes as string).trim(),
        })
        .then(() => {}, (err: unknown) => console.error('[client/book] booking_notes seed failed:', err))
    }

    // Render admin/client emails + SMS with this booking's property address
    // (property ?? client.address) instead of the client's default address.
    applyPropertyToBookingClient(data as Parameters<typeof applyPropertyToBookingClient>[0])

    // Same-day bookings never auto-assign, tenant-wide (global rule — no
    // per-tenant carve-out). A same-day job needs a human's eyes before it
    // goes live on a cleaner's schedule; auto_booking_enabled only governs
    // bookings for a future date. Computed in the tenant's own timezone, not
    // the server's — see getTenantTimezone().
    const isSameDayBooking = startTime.split('T')[0] === new Date().toLocaleDateString('en-CA', { timeZone: getTenantTimezone(tenant) })

    // Smart team suggestion — and, when the tenant has auto-booking on and
    // this isn't a same-day booking (see isSameDayBooking above), a real
    // assignment: the best-scoring AVAILABLE candidate (checked one at a
    // time, in score order) becomes lead, and the booking skips 'pending'
    // entirely. Previously this only ever tried the single top-scored
    // candidate and gave up the moment they had a conflict — even when the
    // very next candidate down the ranked list was completely free — which
    // left the booking stuck unassigned/pending with no cleaner able to
    // check in (Grace Wolf / Dan Cunningham / James Coster, NYC Maid,
    // 2026-08-07). Now it walks the score-ordered list until it finds a
    // conflict-free lead, or exhausts the list.
    try {
      const scores = await scoreTeamForBooking({
        tenantId: tenant.id,
        date: startTime.split('T')[0],
        startTime: startTime.split('T')[1]?.slice(0, 5) || '09:00',
        durationHours: Number(body.estimated_hours) || 2,
        clientAddress: (body.address as string) || '',
        clientId,
      })
      const { lead: best } = pickBestTeam(scores, bkTeamSize)
      if (best) {
        let autoAssigned = false
        if (settings.auto_booking_enabled && !isSameDayBooking) {
          // scoreTeamForBooking's availability is a snapshot — re-check each
          // candidate for a conflicting booking right before committing, so a
          // second request that scored the same member in the same instant
          // can't double-book them.
          const conflictEnd = data.end_time || new Date(new Date(startTime).getTime() + (Number(body.estimated_hours) || 2) * 3_600_000).toISOString()
          const checkConflict = (memberId: string) =>
            supabaseAdmin
              .from('bookings')
              .select('id', { count: 'exact', head: true })
              .eq('tenant_id', tenant.id)
              .eq('team_member_id', memberId)
              .not('status', 'in', '(cancelled,no_show)')
              .lt('start_time', conflictEnd)
              .gt('end_time', startTime)
              .then((r) => r.count || 0)

          // Try each available candidate as lead, best score first, until one
          // is actually conflict-free right now. A candidate who conflicts is
          // skipped in favor of the next-best score — not treated as a dead
          // end for the whole booking.
          const availableSorted = scores.filter((s) => s.available).sort((a, b) => b.score - a.score)
          let chosenLead: (typeof availableSorted)[number] | null = null
          for (const candidate of availableSorted) {
            if ((await checkConflict(candidate.id)) === 0) {
              chosenLead = candidate
              break
            }
          }

          if (chosenLead) {
            // Extras (team_size > 1): best-effort from whoever's left, same
            // "dropped not swapped" semantics as before — a candidate extra
            // that conflicts is simply not added, not replaced by the next
            // name down the list. Matches PUT /api/bookings/[id]/team, where
            // team_size is a request, not a guarantee.
            const wantExtras = Math.max(0, bkTeamSize - 1)
            const extraCandidates = availableSorted.filter((s) => s.id !== chosenLead!.id).slice(0, wantExtras)
            const extraConflictCounts = await Promise.all(extraCandidates.map((c) => checkConflict(c.id)))
            const freeExtras = extraCandidates.filter((_, i) => extraConflictCounts[i] === 0)

            const { data: assigned } = await tenantDb(tenant.id)
              .from('bookings')
              .update({
                team_member_id: chosenLead.id,
                status: 'scheduled',
                suggested_team_member_id: chosenLead.id,
                suggested_reason: chosenLead.reason,
              })
              .eq('id', data.id)
              .select('id, start_time, end_time, hourly_rate, clients(id, name, phone, address, email), team_members!bookings_team_member_id_fkey(name, phone, pin)')
              .single()

            if (assigned) {
              autoAssigned = true
              const teamRows = [
                { tenant_id: tenant.id, booking_id: data.id, team_member_id: chosenLead.id, is_lead: true, position: 1 },
                ...freeExtras.map((c, i) => ({ tenant_id: tenant.id, booking_id: data.id, team_member_id: c.id, is_lead: false, position: i + 2 })),
              ]
              await supabaseAdmin.from('booking_team_members').insert(teamRows) // tenant-scope-ok: insert, tenant_id already stamped on every row above

              const assignedBooking = assigned as unknown as AutoAssignedBooking
              await notifyAutoAssignment(tenant, assignedBooking, { size: bkTeamSize, assignedCount: teamRows.length })
              await notifyExtraTeamMembers(
                tenant, tenant.id, data.id,
                assignedBooking.clients?.name || 'Client',
                assignedBooking.start_time,
                assignedBooking.hourly_rate,
                freeExtras.map((c) => c.id),
              )
            }
          }
        }

        if (!autoAssigned) {
          await tenantDb(tenant.id)
            .from('bookings')
            .update({
              suggested_team_member_id: best.id,
              suggested_reason: best.reason,
            })
            .eq('id', data.id)
        }
      }
    } catch (e) {
      console.error('Smart suggestion error:', e)
    }

    // Admin notify — same-day bookings get a distinct, more urgent message
    // since auto-assign was deliberately skipped for them (see
    // isSameDayBooking above) and they need a human to assign + schedule.
    const bookingMsg = `New booking from ${data.clients?.name || 'Unknown'}${body.ref_code ? ` (Ref: ${body.ref_code})` : ''} • by Client`
    await notify({
      tenantId: tenant.id,
      type: 'new_booking',
      title: isSameDayBooking ? 'Same-Day Booking — Needs Manual Assignment' : 'New Booking Request',
      message: isSameDayBooking ? `⚠️ SAME-DAY: ${bookingMsg}. Auto-scheduling is skipped for same-day jobs — assign a cleaner and mark it Scheduled manually.` : bookingMsg,
      booking_id: data.id,
    })

    // NYC Maid emergency alert — same-day / under-48hr bookings need a cleaner ASAP.
    if (isNycMaid(tenant.id) && bkIsEmergency) {
      await nmSmsAdmins(
        `🚨 EMERGENCY: ${data.clients?.name || 'Client'} booked ${data.service_type || 'cleaning'} for ${bookingDate}. $89/hr, no discount${bkTeamSize > 1 ? `, ${bkTeamSize} cleaners` : ''}. Assign a cleaner ASAP.`,
      ).catch(() => {})
    }

    // Attribution
    try {
      if (body.src) {
        await tenantDb(tenant.id)
          .from('bookings')
          .update({
            attributed_domain: body.src as string,
            attribution_confidence: 100,
            attributed_at: new Date().toISOString(),
          })
          .eq('id', data.id)
      } else {
        await autoAttributeBooking(tenant.id, data.id, clientId as string, data.created_at)
      }
    } catch (attrErr) {
      console.error('Attribution error:', attrErr)
    }

    // Emails + SMS (async, tolerant)
    void (async () => {
      try {
        const td = templateData(tenant)
        const admin = adminNewBookingRequestEmail({
          clientName: data.clients?.name || 'Client',
          clientPhone: data.clients?.phone,
          clientEmail: data.clients?.email,
          address: data.clients?.address,
          date: bookingDate,
          time: (body.time as string) || '',
          notes: (body.notes as string) || '',
        }, td)
        if (await isCommEnabled(tenant.id, 'owner_new_booking', 'email')) {
          await emailAdmins(tenant, admin.subject, admin.html)
        }

        if (referrerData?.email) {
          const ref = referralSignupNotifyEmail({ name: referrerData.name }, td)
          await sendEmail({
            to: referrerData.email,
            subject: ref.subject,
            html: ref.html,
            resendApiKey: tenant.resend_api_key,
            from: tenant.email_from || undefined,
          })
        }

        if (data.clients?.email && tenant.resend_api_key && (await isCommEnabled(tenant.id, 'booking_received', 'email'))) {
          const { subject, html } = bookingReceivedEmail(tenant, data)
          await sendEmail({
            to: data.clients.email,
            subject,
            html,
            resendApiKey: tenant.resend_api_key,
            from: tenant.email_from || undefined,
          })
          await tenantDb(tenant.id).from('email_logs').insert({
            booking_id: data.id,
            email_type: 'booking_received',
            recipient: data.clients.email,
          }).then(() => {}, () => {})
        }

        if (data.clients?.phone && tenant.telnyx_api_key && tenant.telnyx_phone && (await isCommEnabled(tenant.id, 'booking_received', 'sms'))) {
          await sendSMS({
            to: data.clients.phone,
            body: clientSmsTemplates(tenant).bookingReceived(data),
            telnyxApiKey: tenant.telnyx_api_key,
            telnyxPhone: tenant.telnyx_phone,
          })
        }
      } catch (emailError) {
        console.error('Booking notify error:', emailError)
        await notify({
          tenantId: tenant.id,
          type: 'error',
          title: 'Email Failed',
          message: `Booking email error for ${data.clients?.name || 'Unknown'}`,
        }).catch(() => {})
      }
    })()

    await audit({ tenantId: tenant.id, action: 'portal.booking_created', entityType: 'booking', entityId: data.id, details: { is_new_client: isNewClient, start_time: data.start_time } })

    // Mirror this booking into the sales pipeline as a booking-mode deal at
    // 'pending', linked by booking_id. Its stage then auto-syncs with the
    // booking lifecycle (see /api/bookings/[id]/status: scheduled/confirmed →
    // sold, cancelled/no_show → lost). Non-blocking: a failure here must never
    // break the booking the customer just made.
    try {
      await tenantDb(tenant.id).from('deals').insert({
        client_id: clientId || null,
        booking_id: data.id,
        mode: 'booking',
        stage: 'pending',
        title: (data.service_type as string) || 'Booking',
        value_cents: Math.round(Number(data.price) || 0),
        probability: 100,
        source: (body.src as string) || 'booking',
        status: 'active',
      })
    } catch (dealErr) {
      console.error('Mirror-deal create error (non-blocking):', dealErr)
    }

    return NextResponse.json({ ...data, is_new_client: isNewClient })
  } catch (err) {
    console.error('Booking error:', err)
    await trackError(err, { source: 'client/book:unhandled', tenantId: tenant.id, severity: 'high', alwaysAlert: true })
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
