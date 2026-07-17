import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { emailAdmins } from '@/lib/admin-contacts'
import { applyRecurringDiscount } from '@/lib/nycmaid/recurring-discount'
import {
  adminNewBookingRequestEmail,
  referralSignupNotifyEmail,
} from '@/lib/email-templates'
import { bookingReceivedEmail } from '@/lib/messaging/client-email'
import { clientSmsTemplates } from '@/lib/messaging/client-sms'
import { autoAttributeBooking } from '@/lib/attribution'
import { resolveProperty, applyPropertyToBookingClient } from '@/lib/client-properties'
import { scoreTeamForBooking } from '@/lib/smart-schedule'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { getSettings } from '@/lib/settings'
import { labelToHour } from '@/lib/time-slots'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { randomInt, randomBytes } from 'crypto'
import { audit } from '@/lib/audit'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'

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

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`client-book:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many booking attempts. Please wait a few minutes.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>)) as Record<string, unknown>

    if (!body.client_id && !body.email && !body.phone) {
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
        return NextResponse.json({ error: 'Client not found' }, { status: 404 })
      }
      if (ownedClient.do_not_service) {
        const contactPhone = tenant.phone || ''
        return NextResponse.json({
          error: `Please contact us${contactPhone ? ` at ${contactPhone}` : ''} to schedule your next service.`,
        }, { status: 403 })
      }
    }

    let clientId = body.client_id as string | undefined
    let isNewClient = false

    if (!clientId && body.email) {
      const phone = (body.phone as string | undefined)?.replace(/\D/g, '') || ''
      const emailLower = (body.email as string).toLowerCase()

      const { data: byEmail } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('tenant_id', tenant.id)
        .ilike('email', emailLower)
        .maybeSingle()
      if (byEmail) clientId = byEmail.id

      if (!clientId && phone) {
        const { data: byPhone } = await supabaseAdmin
          .from('clients')
          .select('id')
          .eq('tenant_id', tenant.id)
          .eq('phone', phone)
          .maybeSingle()
        if (byPhone) clientId = byPhone.id
      }

      if (!clientId) {
        const { data: newClient, error: createErr } = await supabaseAdmin
          .from('clients')
          .insert({
            tenant_id: tenant.id,
            name: body.name as string,
            email: emailLower,
            phone,
            address: (body.address as string) + (body.unit ? `, ${body.unit}` : ''),
            notes: (body.notes as string) || '',
            pin: String(100000 + randomInt(0, 900000)),
          })
          .select()
          .single()
        if (createErr || !newClient) {
          return NextResponse.json({ error: `Failed to create client: ${createErr?.message}` }, { status: 500 })
        }
        clientId = newClient.id
        isNewClient = true
        await notify({
          tenantId: tenant.id,
          type: 'new_client',
          title: 'New Client (via Booking)',
          message: `${body.name} • ${emailLower}${phone ? ` • ${phone}` : ''}`,
        })
      } else {
        // clientId was matched by email/phone, not caller-supplied body.client_id
        // — the do-not-service gate above only ever ran for the body.client_id
        // path, so a client the business banned could bypass it entirely by
        // submitting this public form with just their known email/phone instead
        // of their id, creating a real booking (not just an SMS oversight).
        const { data: matchedClient } = await supabaseAdmin
          .from('clients')
          .select('do_not_service')
          .eq('id', clientId)
          .eq('tenant_id', tenant.id)
          .maybeSingle()
        if (matchedClient?.do_not_service) {
          const contactPhone = tenant.phone || ''
          return NextResponse.json({
            error: `Please contact us${contactPhone ? ` at ${contactPhone}` : ''} to schedule your next service.`,
          }, { status: 403 })
        }
      }
    }

    // Referral resolution (tenant-scoped)
    let referrerId: string | null = null
    let referrerData: { id: string; name: string; email?: string | null } | null = null
    if (body.ref_code) {
      const { data: referrer } = await supabaseAdmin
        .from('referrers')
        .select('id, name, email')
        .eq('tenant_id', tenant.id)
        .eq('ref_code', (body.ref_code as string).toUpperCase())
        .eq('active', true)
        .maybeSingle()
      if (referrer) {
        referrerId = referrer.id
        referrerData = referrer
        if (clientId) {
          await supabaseAdmin
            .from('clients')
            .update({ referrer_id: referrerId })
            .eq('id', clientId)
            .eq('tenant_id', tenant.id)
            .is('referrer_id', null)
        }
      }
    }

    // Time computation
    let startTime = body.start_time as string | undefined
    let endTime = body.end_time as string | undefined
    if (body.date && body.time && !startTime) {
      // Parse any slot label (incl. evening/24-7 slots), not just a fixed 9am-4pm map.
      const hour = labelToHour(body.time as string) ?? 9
      const duration = Number(body.estimated_hours) || 2
      startTime = `${body.date}T${String(hour).padStart(2, '0')}:00:00`
      endTime = `${body.date}T${String(hour + duration).padStart(2, '0')}:00:00`
    }
    if (!startTime) return NextResponse.json({ error: 'start_time or date+time required' }, { status: 400 })

    const cleanerToken = generateCleanerToken()
    const tokenExpiresAt = new Date(startTime)
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

    // Holiday gate — skipped for open_365 / 24-7 tenants (emergency trades book
    // on holidays). Mirrors checkAvailability, which already exempts open_365.
    const { open_365 } = await getSettings(tenant.id)
    if (!open_365) {
      const { isHoliday } = await import('@/lib/holidays')
      const holidayName = isHoliday(startTime.split('T')[0])
      if (holidayName) {
        return NextResponse.json({ error: `We're closed for ${holidayName}. Please choose another date.` }, { status: 400 })
      }
    }

    const bookingDate = startTime.split('T')[0]

    // ===== PRICING =====
    // Generic default; the NYC Maid tenant layers its supplies/emergency/
    // self-book rules on top (tenant-scoped parity, not global).
    let bkHourlyRate = Number(body.hourly_rate) || 75
    let bkPrice = applyRecurringDiscount(Number(body.price) || bkHourlyRate * (Number(body.estimated_hours) || 2) * 100, body.recurring_type === 'none' ? null : (body.recurring_type as string | undefined))
    let bkNotes = (body.notes as string) || ''
    const bkTeamSize = Math.max(1, Math.min(8, Number(body.team_size) || 1))
    let bkIsEmergency = false
    const bkMaxHours = typeof body.max_hours === 'number' && body.max_hours > 0 ? (body.max_hours as number) : null

    if (isNycMaid(tenant.id)) {
      // Emergency = same-day, OR a multi-cleaner booking under 48hr notice.
      // Emergency rate ($89) overrides the supplies-based rate ($59 client-
      // supplies / $69 we-bring). 2hr min (single) / 4hr min (2+ cleaners).
      // The $10 self-booking promo (applied at billing in the 30-min alert) is
      // suppressed for emergency + multi-cleaner. Faithful port of NYC Maid.
      const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
      const isSameDay = bookingDate === todayET
      const hoursUntilBooking = (new Date(startTime).getTime() - Date.now()) / 3_600_000
      const isUnder48 = hoursUntilBooking < 48
      const isMultiCleaner = bkTeamSize >= 2
      bkIsEmergency = isSameDay || (isUnder48 && isMultiCleaner)
      const effectiveRate = bkIsEmergency ? 89 : (Number(body.hourly_rate) || 69)
      const minHours = isMultiCleaner ? 4 : 2
      const billableHours = Math.max(Number(body.estimated_hours) || 2, minHours)
      bkHourlyRate = effectiveRate
      bkPrice = Math.round(effectiveRate * billableHours * bkTeamSize * 100)
      const discountEligible = !bkIsEmergency && !isMultiCleaner
      bkNotes = ((body.notes as string) || '') + (discountEligible
        ? '\n\n[Promo: $10 self-booking discount applies at billing]'
        : isMultiCleaner
          ? `\n\n[Multi-cleaner booking — no discount, 4-hour minimum${bkIsEmergency ? ', under-48hr emergency $89/hr' : ''}]`
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
    // already-committed booking.
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
      p_service_type: (body.service_type as string) || (isNycMaid(tenant.id) ? 'Standard Cleaning' : 'Service'),
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
    })
    if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 })
    if (!claim?.created) {
      if (claim?.reason === 'duplicate_date') {
        return NextResponse.json({ error: 'You already have a booking on this date.' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Insert failed' }, { status: 500 })
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select('*, clients(*), client_properties(*)')
      .eq('id', claim.booking.id)
      .eq('tenant_id', tenant.id)
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })

    // Render admin/client emails + SMS with this booking's property address
    // (property ?? client.address) instead of the client's default address.
    applyPropertyToBookingClient(data as Parameters<typeof applyPropertyToBookingClient>[0])

    // Smart team suggestion
    try {
      const scores = await scoreTeamForBooking({
        tenantId: tenant.id,
        date: startTime.split('T')[0],
        startTime: startTime.split('T')[1]?.slice(0, 5) || '09:00',
        durationHours: Number(body.estimated_hours) || 2,
        clientAddress: (body.address as string) || '',
        clientId,
      })
      const best = scores.find(s => s.available && s.score > 0)
      if (best) {
        await supabaseAdmin
          .from('bookings')
          .update({
            suggested_team_member_id: best.id,
            suggested_reason: best.reason,
          })
          .eq('id', data.id)
          .eq('tenant_id', tenant.id)
      }
    } catch (e) {
      console.error('Smart suggestion error:', e)
    }

    // Admin notify
    const bookingMsg = `New booking from ${data.clients?.name || 'Unknown'}${body.ref_code ? ` (Ref: ${body.ref_code})` : ''} • by Client`
    await notify({
      tenantId: tenant.id,
      type: 'new_booking',
      title: 'New Booking Request',
      message: bookingMsg,
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
        await supabaseAdmin
          .from('bookings')
          .update({
            attributed_domain: body.src as string,
            attribution_confidence: 100,
            attributed_at: new Date().toISOString(),
          })
          .eq('id', data.id)
          .eq('tenant_id', tenant.id)
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
        await emailAdmins(tenant, admin.subject, admin.html)

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

        if (data.clients?.email && tenant.resend_api_key) {
          const { subject, html } = bookingReceivedEmail(tenant, data)
          await sendEmail({
            to: data.clients.email,
            subject,
            html,
            resendApiKey: tenant.resend_api_key,
            from: tenant.email_from || undefined,
          })
          await supabaseAdmin.from('email_logs').insert({
            tenant_id: tenant.id,
            booking_id: data.id,
            email_type: 'booking_received',
            recipient: data.clients.email,
          }).then(() => {}, () => {})
        }

        // sms_consent, same invariant every other client SMS fan-out enforces
        // (payment-processor.ts, webhooks/stripe.ts) — do_not_service clients
        // never reach here (blocked above), but a client who has replied STOP
        // (sms_consent=false) must still stop receiving texts, including this one.
        if (data.clients?.phone && data.clients?.sms_consent !== false && tenant.telnyx_api_key && tenant.telnyx_phone) {
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
      await supabaseAdmin.from('deals').insert({
        tenant_id: tenant.id,
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
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
