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
import { rateLimitDb } from '@/lib/rate-limit-db'
import { escapeLikeValue } from '@/lib/postgrest-safe'
import { randomInt, randomBytes } from 'crypto'
import { audit } from '@/lib/audit'
import { isNycMaid } from '@/lib/nycmaid/tenant'
import { smsAdmins as nmSmsAdmins } from '@/lib/nycmaid/admin-contacts'
import { computeNaiveVisitWindow } from '@/lib/recurring'

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

    // Ownership + DNS (do-not-service) gate. A caller-supplied client_id must
    // resolve to a row scoped to THIS tenant — otherwise it silently flows
    // into resolveProperty() and the bookings insert, whose response joins
    // clients(*)/client_properties(*) and would leak an unrelated tenant's
    // client PII (and pollute their property list) to whoever guessed/leaked
    // the UUID.
    if (body.client_id) {
      const { data: dnsCheck } = await supabaseAdmin
        .from('clients')
        .select('do_not_service')
        .eq('id', body.client_id as string)
        .eq('tenant_id', tenant.id)
        .maybeSingle()
      if (!dnsCheck) {
        return NextResponse.json({ error: 'Invalid client' }, { status: 400 })
      }
      if (dnsCheck.do_not_service) {
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
        .ilike('email', escapeLikeValue(emailLower))
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
      const timeMap: Record<string, number> = {
        '9:00 AM': 9, '10:00 AM': 10, '11:00 AM': 11, '12:00 PM': 12,
        '1:00 PM': 13, '2:00 PM': 14, '3:00 PM': 15, '4:00 PM': 16,
      }
      const hour = timeMap[body.time as string] || 9
      const duration = Number(body.estimated_hours) || 2
      // Raw `hour + duration` hour-of-day arithmetic (the old version here)
      // produces an invalid/malformed timestamp -- e.g. a 4:00 PM slot with a
      // 9h job (RemoteBookForm.tsx defaults estimated_hours to 10) built
      // "...T25:00:00" -- instead of rolling over to the next calendar date,
      // same midnight-crossing class computeNaiveVisitWindow was centralized
      // to fix for every OTHER recurring-booking writer; this client
      // self-service date+time fallback was never migrated to it.
      const window = computeNaiveVisitWindow(body.date as string, hour, 0, duration)
      startTime = window.startISO
      endTime = window.endISO
    }
    if (!startTime) return NextResponse.json({ error: 'start_time or date+time required' }, { status: 400 })

    const cleanerToken = generateCleanerToken()
    const tokenExpiresAt = new Date(startTime)
    tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 24)

    // Holiday gate
    const { isHoliday } = await import('@/lib/holidays')
    const holidayName = isHoliday(startTime.split('T')[0])
    if (holidayName) {
      return NextResponse.json({ error: `We're closed for ${holidayName}. Please choose another date.` }, { status: 400 })
    }

    // Same-date duplicate gate
    const bookingDate = startTime.split('T')[0]
    const { count: existingCount } = await supabaseAdmin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .eq('client_id', clientId as string)
      .gte('start_time', `${bookingDate}T00:00:00`)
      .lte('start_time', `${bookingDate}T23:59:59`)
      .in('status', ['scheduled', 'pending', 'confirmed', 'in_progress'])
    if ((existingCount || 0) > 0) {
      return NextResponse.json({ error: 'You already have a booking on this date.' }, { status: 409 })
    }

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
    // Template booking form (RemoteBookForm.tsx) and other callers send the bare
    // literal 'monthly' as cadence -- RecurringType (lib/recurring.ts) has no bare
    // 'monthly', only monthly_date/monthly_weekday, so it's normalized here the same
    // way client/recurring's schedule-creation path already does. This route never
    // creates a recurring_schedules row (no cron dependency), but the raw value does
    // reach formatRecurringLabel's display fallback -- normalizing keeps "Schedule:
    // Monthly" instead of the unformatted "Schedule: monthly".
    const bkRecurringType = body.recurring_type === 'none' || !body.recurring_type
      ? null
      : body.recurring_type === 'monthly' ? 'monthly_date' : (body.recurring_type as string)
    let bkPrice = applyRecurringDiscount(bkHourlyRate * bkEstimatedHours * 100, bkRecurringType)
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
      // NYC Maid's only two legitimate non-emergency rates are the published
      // supplies tiers. Anything else in the request is rejected in favor of
      // the higher (we-bring) default, closing the direct "set hourly_rate=1"
      // underpay exploit for this tenant precisely.
      const NYCMAID_VALID_RATES = new Set([59, 69])
      const effectiveRate = bkIsEmergency ? 89 : (NYCMAID_VALID_RATES.has(rawHourlyRate) ? rawHourlyRate : 69)
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

    // Client may explicitly choose their cleaner in the "Choose your team"
    // step (fed by GET /api/client/smart-schedule's tenant-scoped list) --
    // body.cleaner_id/extra_cleaner_ids were parsed off the request but never
    // read anywhere in this route; every self-booked booking silently landed
    // with team_member_id: null regardless of what the client picked, always
    // routed to admin for manual assignment instead. Re-validate against this
    // tenant's active roster before trusting it -- same ownership gate PUT
    // /api/client/reschedule/[id] already enforces for team_member_id.
    const rawCleanerId = typeof body.cleaner_id === 'string' && body.cleaner_id ? body.cleaner_id : null
    const rawExtraCleanerIds = Array.isArray(body.extra_cleaner_ids)
      ? (body.extra_cleaner_ids as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0)
      : []
    const candidateTeamMemberIds = Array.from(new Set([rawCleanerId, ...rawExtraCleanerIds].filter((x): x is string => !!x)))
    let leadTeamMemberId: string | null = null
    let extraTeamMemberIds: string[] = []
    if (candidateTeamMemberIds.length > 0) {
      const { data: validMembers } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('tenant_id', tenant.id)
        .eq('active', true)
        .in('id', candidateTeamMemberIds)
      const validIds = new Set((validMembers || []).map(m => m.id as string))
      leadTeamMemberId = rawCleanerId && validIds.has(rawCleanerId) ? rawCleanerId : null
      extraTeamMemberIds = rawExtraCleanerIds.filter(id => id !== leadTeamMemberId && validIds.has(id))
    }

    // Create booking. self_book_dedup_key backstops the same-date check above
    // against a concurrent double-submit (see migration
    // 067_unique_self_book_dedup.sql) -- the SELECT count above is
    // check-then-insert and can race; the partial unique index on this
    // column is the atomic guarantee, caught as 23505 below.
    const selfBookDedupKey = `${clientId}:${bookingDate}`
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenant.id,
        client_id: clientId,
        property_id: propertyId,
        team_member_id: leadTeamMemberId,
        start_time: startTime,
        end_time: endTime,
        service_type: (body.service_type as string) || 'Standard Cleaning',
        status: 'pending',
        price: bkPrice,
        hourly_rate: bkHourlyRate,
        team_size: bkTeamSize,
        is_emergency: bkIsEmergency,
        max_hours: bkMaxHours,
        notes: bkNotes,
        recurring_type: bkRecurringType,
        team_member_token: cleanerToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        referrer_id: referrerId,
        ref_code: (body.ref_code as string) || null,
        self_book_dedup_key: selfBookDedupKey,
      })
      .select('*, clients(*), client_properties(*)')
      .single()
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'You already have a booking on this date.' }, { status: 409 })
    }
    if (error || !data) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })

    // GET /api/bookings/:id/team and closeout-summary source the lead from
    // booking_team_members, not bookings.team_member_id -- same
    // booking_team_members-sync gap fixed at every other bookings.team_member_id
    // write site this session (e.g. client/recurring's INITIAL-creation path).
    if (leadTeamMemberId || extraTeamMemberIds.length > 0) {
      const teamRows: { tenant_id: string; booking_id: string; team_member_id: string; is_lead: boolean; position: number }[] = []
      if (leadTeamMemberId) teamRows.push({ tenant_id: tenant.id, booking_id: data.id, team_member_id: leadTeamMemberId, is_lead: true, position: 1 })
      extraTeamMemberIds.forEach((id, i) => teamRows.push({ tenant_id: tenant.id, booking_id: data.id, team_member_id: id, is_lead: false, position: i + 2 }))
      const { error: teamErr } = await supabaseAdmin
        .from('booking_team_members')  // tenant-scope-ok: row-scoped by unique join keys (booking_id, team_member_id)
        .upsert(teamRows, { onConflict: 'booking_id,team_member_id' })
      if (teamErr) console.error('client book booking_team_members insert failed:', teamErr.message)
    }

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

        if (data.clients?.phone && tenant.telnyx_api_key && tenant.telnyx_phone) {
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
