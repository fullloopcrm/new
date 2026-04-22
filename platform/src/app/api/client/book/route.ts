import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendEmail } from '@/lib/email'
import { sendSMS } from '@/lib/sms'
import { notify } from '@/lib/notify'
import { emailAdmins } from '@/lib/admin-contacts'
import {
  adminNewBookingRequestEmail,
  referralSignupNotifyEmail,
  clientBookingReceivedEmail,
} from '@/lib/email-templates'
import { smsBookingReceived } from '@/lib/sms-templates'
import { autoAttributeBooking } from '@/lib/attribution'
import { scoreTeamForBooking } from '@/lib/smart-schedule'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { randomInt, randomBytes } from 'crypto'

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

    // DNS (do-not-service) gate — never create bookings for these clients.
    if (body.client_id) {
      const { data: dnsCheck } = await supabaseAdmin
        .from('clients')
        .select('do_not_service')
        .eq('id', body.client_id as string)
        .eq('tenant_id', tenant.id)
        .single()
      if (dnsCheck?.do_not_service) {
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
      startTime = `${body.date}T${String(hour).padStart(2, '0')}:00:00`
      endTime = `${body.date}T${String(hour + duration).padStart(2, '0')}:00:00`
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

    // Create booking
    const { data, error } = await supabaseAdmin
      .from('bookings')
      .insert({
        tenant_id: tenant.id,
        client_id: clientId,
        team_member_id: null,
        start_time: startTime,
        end_time: endTime,
        service_type: (body.service_type as string) || 'Standard Cleaning',
        status: 'pending',
        price: Number(body.price) || (Number(body.hourly_rate) || 75) * (Number(body.estimated_hours) || 2) * 100,
        hourly_rate: Number(body.hourly_rate) || 75,
        notes: (body.notes as string) || '',
        recurring_type: body.recurring_type === 'none' ? null : (body.recurring_type as string | undefined),
        cleaner_token: cleanerToken,
        token_expires_at: tokenExpiresAt.toISOString(),
        referrer_id: referrerId,
        ref_code: (body.ref_code as string) || null,
      })
      .select('*, clients(*)')
      .single()
    if (error || !data) return NextResponse.json({ error: error?.message || 'Insert failed' }, { status: 500 })

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
          const html = clientBookingReceivedEmail({
            ...td,
            clientName: data.clients.name,
            dateTime: `${bookingDate} ${(body.time as string) || ''}`,
            serviceName: data.service_type,
          })
          await sendEmail({
            to: data.clients.email,
            subject: `Booking received — ${tenant.name}`,
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
            body: smsBookingReceived(tenant.name, data),
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

    return NextResponse.json({ ...data, is_new_client: isNewClient })
  } catch (err) {
    console.error('Booking error:', err)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}
