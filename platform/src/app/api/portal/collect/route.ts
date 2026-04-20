/**
 * Public lead-capture (tenant resolved from host).
 * Ported from nycmaid `/api/client/collect` — "finish your booking" funnel.
 *
 * Flow:
 *   - Rate-limited by IP (3 per 10 min, DB-backed).
 *   - Matches or inserts `clients` row (by phone ilike).
 *   - Writes a `portal_leads` row for funnel analytics.
 *   - Notifies tenant admins (email + SMS + in-app).
 *   - If Selena conversation is attached (`convo_id`), links it to the client
 *     and sends a recap SMS using tenant config.
 *   - Attempts address attribution (matches recent visits to tenant domains).
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendSMS } from '@/lib/sms'
import { emailAdmins } from '@/lib/admin-contacts'
import { adminNewClientEmail } from '@/lib/email-templates'
import { trackError } from '@/lib/error-tracking'
import { attributeCollectForm } from '@/lib/attribution'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'
import { randomInt } from 'crypto'

interface CollectBody {
  name?: string
  email?: string
  phone?: string
  address?: string
  notes?: string
  referrer_name?: string
  referrer_phone?: string
  src?: string
  convo_id?: string
  pet_name?: string
  pet_type?: string
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantFromHeaders()
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found for this host' }, { status: 404 })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const limit = await rateLimitDb(`collect:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please wait a few minutes.' }, { status: 429 })
    }

    const body = (await request.json()) as CollectBody
    const { name, email, phone, address, notes, referrer_name, referrer_phone, src, convo_id, pet_name, pet_type } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Existing client match by phone (tenant-scoped)
    const cleanPhone = phone.replace(/\D/g, '')
    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .ilike('phone', `%${cleanPhone.slice(-10)}%`)
      .limit(1)

    const existingClient = existing?.[0]

    // Referrer lookup
    let referrerId: string | null = null
    if (referrer_phone) {
      const refPhone = referrer_phone.replace(/\D/g, '')
      if (refPhone.length >= 10) {
        const { data: byPhone } = await supabaseAdmin
          .from('referrers')
          .select('id')
          .eq('tenant_id', tenant.id)
          .ilike('phone', `%${refPhone.slice(-10)}%`)
          .eq('active', true)
          .limit(1)

        if (byPhone && byPhone.length > 0) {
          referrerId = byPhone[0].id
        } else {
          await supabaseAdmin.from('notifications').insert({
            tenant_id: tenant.id,
            type: 'referral_lead',
            title: 'New Referrer Lead',
            message: `${referrer_name || 'Unknown'} (${referrer_phone}) referred ${name} — not in system`,
            channel: 'system',
            recipient_type: 'admin',
          })
        }
      }
    } else if (referrer_name) {
      const { data: byName } = await supabaseAdmin
        .from('referrers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .ilike('name', `%${referrer_name.trim()}%`)
        .eq('active', true)
        .limit(1)

      if (byName && byName.length > 0) {
        referrerId = byName[0].id
      } else {
        await supabaseAdmin.from('notifications').insert({
          tenant_id: tenant.id,
          type: 'referral_lead',
          title: 'New Referrer Lead',
          message: `${referrer_name} referred ${name} — not in system (no phone provided)`,
          channel: 'system',
          recipient_type: 'admin',
        })
      }
    }

    const referralInfo = referrer_name
      ? `${referrer_name}${referrer_phone ? ' (' + referrer_phone + ')' : ''}`
      : null
    const clientNotes = referralInfo && !referrerId
      ? `Referral: ${referralInfo}${notes ? '\n' + notes : ''}`
      : notes || null
    const notesValue = src ? `Source: ${src}${clientNotes ? '\n' + clientNotes : ''}` : clientNotes

    let data: { id: string;[key: string]: unknown }

    if (existingClient) {
      const { data: updated, error } = await supabaseAdmin
        .from('clients')
        .update({
          name,
          email: email || null,
          address: address || null,
          notes: notesValue,
          referrer_id: referrerId || undefined,
          active: true,
          status: 'active',
          ...(pet_name ? { pet_name } : {}),
          ...(pet_type ? { pet_type } : {}),
        })
        .eq('id', existingClient.id)
        .eq('tenant_id', tenant.id)
        .select()
        .single()

      if (error) throw error
      data = updated as { id: string;[key: string]: unknown }
    } else {
      const { data: inserted, error } = await supabaseAdmin
        .from('clients')
        .insert({
          tenant_id: tenant.id,
          name,
          email: email || null,
          phone,
          address: address || null,
          notes: notesValue,
          referrer_id: referrerId,
          pet_name: pet_name || null,
          pet_type: pet_type || null,
          pin: randomInt(100000, 1000000).toString(),
        })
        .select()
        .single()

      if (error) throw error
      data = inserted as { id: string;[key: string]: unknown }
    }

    // Funnel analytics
    await supabaseAdmin.from('portal_leads').insert({
      tenant_id: tenant.id,
      name,
      email: email || null,
      phone,
      notes: notesValue,
      source: src || null,
      referrer_domain: null,
      conversation_id: convo_id || null,
      client_id: data.id,
    }).then(() => {}, () => {})

    // Dashboard notification
    await notify({
      tenantId: tenant.id,
      type: 'new_client',
      title: 'New Client Collected',
      message:
        name +
        (src ? ' • from ' + src : '') +
        (referralInfo ? ' (Ref: ' + referralInfo + ')' : '') +
        ' • via Collect Form',
    })

    // Admin email
    try {
      const adminUrl = `${tenantSiteUrl(tenant)}/admin/clients`
      const msg = adminNewClientEmail(
        {
          name,
          phone,
          email,
          address,
          notes: clientNotes || undefined,
          referralInfo: referralInfo || undefined,
          referrerMatched: !!referrerId,
        },
        { tenantName: tenant.name, primaryColor: tenant.primary_color || undefined, logoUrl: tenant.logo_url || undefined, adminUrl },
      )
      await emailAdmins(tenant, msg.subject, msg.html)
    } catch (emailErr) {
      console.error('[portal/collect] admin email error:', emailErr)
    }

    // Attribution
    if (address) {
      try {
        await attributeCollectForm(tenant.id, name, address, data.id)
      } catch (attrErr) {
        console.error('[portal/collect] attribution error:', attrErr)
      }
    }

    // Selena conversation handoff
    if (convo_id) {
      try {
        const { data: convo } = await supabaseAdmin
          .from('sms_conversations')
          .select('*')
          .eq('id', convo_id)
          .eq('tenant_id', tenant.id)
          .is('completed_at', null)
          .single()

        if (convo) {
          await supabaseAdmin
            .from('sms_conversations')
            .update({
              client_id: data.id,
              state: 'form_received',
              updated_at: new Date().toISOString(),
            })
            .eq('id', convo_id)

          const firstName = (name || '').split(' ')[0]
          const prefDate = convo.preferred_date
            ? new Date(convo.preferred_date + 'T12:00:00').toLocaleDateString('en-US', {
                timeZone: tenant.timezone || 'America/New_York',
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })
            : null
          const prefTime = convo.preferred_time || null
          const rate = convo.hourly_rate ? `$${convo.hourly_rate}/hr` : null
          const zelleEmail = tenant.zelle_email || tenant.email || ''

          let recapMsg: string
          if (prefDate && address) {
            const parts = [`We're scheduling you for ${prefDate}`]
            parts.push(`at ${address}`)
            if (prefTime) parts.push(`at ${prefTime}`)
            parts.push(`We always allow for an additional 30 minutes due to traffic.`)
            if (rate) parts.push(`Billed at the rate of ${rate} in 30-minute increments, paid via Zelle (${zelleEmail}) or Apple Pay 30 minutes before completion.`)
            else parts.push(`Paid via Zelle (${zelleEmail}) or Apple Pay 30 minutes before completion. Time billed in 30-minute increments.`)
            recapMsg = `Ok ${firstName}, got your info ty! 😊 Let's recap:\n\n${parts.join('. ').replace(/\.\./g, '.')}\n\nPlease confirm all is correct — we have a no-cancellation policy for first-time and one-time services 😊`
          } else if (prefDate) {
            recapMsg = `Ok ${firstName}, got your info ty! 😊 We have you down for ${prefDate}${prefTime ? ' at ' + prefTime : ''}${rate ? ', ' + rate : ''}. Paid via Zelle (${zelleEmail}) or Apple Pay ~30 min before completion. No-cancellation policy for first-time services 😊`
          } else {
            recapMsg = `Ok ${firstName}, got your info ty! 😊 I'll send you confirmation with all the details shortly. No-cancellation policy for first-time services 😊`
          }

          if (tenant.telnyx_api_key && tenant.telnyx_phone && convo.phone) {
            await sendSMS({
              to: convo.phone,
              body: recapMsg,
              telnyxApiKey: tenant.telnyx_api_key,
              telnyxPhone: tenant.telnyx_phone,
            }).catch((e) => console.error('[portal/collect] sms err:', e))
          }

          await supabaseAdmin.from('sms_conversation_messages').insert({
            conversation_id: convo_id,
            tenant_id: tenant.id,
            direction: 'outbound',
            message: recapMsg,
          }).then(() => {}, () => {})
        }
      } catch (chatbotErr) {
        console.error('[portal/collect] chatbot handoff error:', chatbotErr)
      }
    }

    return NextResponse.json({ success: true, client_id: data.id })
  } catch (err) {
    console.error('[portal/collect] error:', err)
    await trackError(err, { source: 'api/portal/collect', severity: 'high' }).catch(() => {})
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
