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
import { tenantDb } from '@/lib/tenant-db'
import { sendSMS } from '@/lib/sms'
import { emailAdmins } from '@/lib/admin-contacts'
import { adminNewClientEmail } from '@/lib/email-templates'
import { trackError } from '@/lib/error-tracking'
import { attributeCollectForm } from '@/lib/attribution'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders, tenantSiteUrl } from '@/lib/tenant-site'
import { createPrimaryContact } from '@/lib/client-contacts'
import { randomInt } from 'crypto'
import { encryptSecretSafe } from '@/lib/secret-crypto'
import { insertConversationMessage } from '@/lib/sms-messages'
import { isSpamSubmission } from '@/lib/spam-guard'

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
  // Bot defense — see src/lib/spam-guard.ts
  _hp?: string
  _ts?: number
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

    const db = tenantDb(tenant.id)
    const body = (await request.json()) as CollectBody
    if (isSpamSubmission(body)) {
      trackError(new Error('Submission blocked by spam guard'), {
        source: 'api/portal/collect', tenantId: tenant.id, severity: 'low', alwaysAlert: true,
      }).catch(() => {})
      return NextResponse.json({ success: true })
    }
    const { name, email, phone, address, notes, referrer_name, referrer_phone, src, convo_id, pet_name, pet_type } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Existing client match by phone (tenant-scoped)
    // tenantDb's select() takes a non-literal `columns` param, which widens
    // supabase-js's column-string type inference — cast to the shape actually selected.
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''
    const { data: existing } = cleanPhone
      ? ((await db
          .from('clients')
          .select('id, status, special_instructions')
          .ilike('phone', `%${cleanPhone.slice(-10)}%`)
          .limit(1)) as { data: { id: string; status: string; special_instructions: string | null }[] | null })
      : { data: [] as { id: string; status: string; special_instructions: string | null }[] }

    const existingClient = existing?.[0]

    // Referrer lookup
    let referrerId: string | null = null
    if (referrer_phone) {
      const refPhone = referrer_phone.replace(/\D/g, '')
      if (refPhone.length >= 10) {
        // tenantDb's select() takes a non-literal `columns` param, which widens
        // supabase-js's column-string type inference — cast to the shape actually selected.
        const { data: byPhone } = (await db
          .from('referrers')
          .select('id')
          .ilike('phone', `%${refPhone.slice(-10)}%`)
          .eq('active', true)
          .limit(1)) as { data: { id: string }[] | null }

        if (byPhone && byPhone.length > 0) {
          referrerId = byPhone[0].id
        } else {
          await db.from('notifications').insert({
            type: 'referral_lead',
            title: 'New Referrer Lead',
            message: `${referrer_name || 'Unknown'} (${referrer_phone}) referred ${name} — not in system`,
            channel: 'system',
            recipient_type: 'admin',
          })
        }
      }
    } else if (referrer_name) {
      const { data: byName } = (await db
        .from('referrers')
        .select('id')
        .ilike('name', `%${referrer_name.trim()}%`)
        .eq('active', true)
        .limit(1)) as { data: { id: string }[] | null }

      if (byName && byName.length > 0) {
        referrerId = byName[0].id
      } else {
        await db.from('notifications').insert({
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

    // `notes` (above) lands on the client record as an operator-only field —
    // nothing in the team/cleaner portal ever reads it, so a client's own
    // self-entered note (gate code, pet, access instructions, etc.) silently
    // never reached the cleaner. `special_instructions` is the field the
    // team portal already surfaces on every booking for this client
    // (src/app/team/page.tsx), so mirror the raw note there too — only when
    // it's not already set, so this never clobbers something an admin wrote.
    const specialInstructionsValue = notes?.trim() || null

    let data: { id: string;[key: string]: unknown }

    if (existingClient) {
      const { data: updated, error } = await db
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
          ...(!existingClient.special_instructions && specialInstructionsValue ? { special_instructions: specialInstructionsValue } : {}),
        })
        .eq('id', existingClient.id)
        .select()
        .single()

      if (error) throw error
      data = updated as { id: string;[key: string]: unknown }
    } else {
      const { data: inserted, error } = await db
        .from('clients')
        .insert({
          name,
          email: email || null,
          phone: phone || null,
          address: address || null,
          notes: notesValue,
          referrer_id: referrerId,
          pet_name: pet_name || null,
          pet_type: pet_type || null,
          special_instructions: specialInstructionsValue,
          // sec-07: encrypt at creation — real gap, this route was creating
          // plaintext pins outside the audited write-site sweep.
          pin: encryptSecretSafe(randomInt(100000, 1000000).toString()),
        })
        .select()
        .single()

      if (error) throw error
      data = inserted as { id: string;[key: string]: unknown }

      await createPrimaryContact(tenant.id, data.id, { name, phone, email }).catch((e) => {
        console.error('createPrimaryContact error:', e)
      })
    }

    // Funnel analytics
    await db.from('portal_leads').insert({
      name,
      email: email || null,
      phone: phone || null,
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
        const { data: convo } = (await db
          .from('sms_conversations')
          .select('*')
          .eq('id', convo_id)
          .is('completed_at', null)
          .single()) as { data: { preferred_date: string | null; preferred_time: string | null; hourly_rate: number | null; phone: string | null } | null }

        if (convo) {
          await db
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
          let recapMsg: string
          if (prefDate && address) {
            const parts = [`We're scheduling you for ${prefDate}`]
            parts.push(`at ${address}`)
            if (prefTime) parts.push(`at ${prefTime}`)
            parts.push(`We always allow for an additional 30 minutes due to traffic.`)
            if (rate) parts.push(`Billed at the rate of ${rate} in 30-minute increments, paid via a secure Stripe link (card, Apple Pay, or Cash App) 30 minutes before completion.`)
            else parts.push(`Paid via a secure Stripe link (card, Apple Pay, or Cash App) 30 minutes before completion. Time billed in 30-minute increments.`)
            recapMsg = `Ok ${firstName}, got your info ty! 😊 Let's recap:\n\n${parts.join('. ').replace(/\.\./g, '.')}\n\nPlease confirm all is correct — we have a no-cancellation policy for first-time and one-time services 😊`
          } else if (prefDate) {
            recapMsg = `Ok ${firstName}, got your info ty! 😊 We have you down for ${prefDate}${prefTime ? ' at ' + prefTime : ''}${rate ? ', ' + rate : ''}. Paid via a secure Stripe link (card, Apple Pay, or Cash App) ~30 min before completion. No-cancellation policy for first-time services 😊`
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

          await insertConversationMessage(
            { conversation_id: convo_id, direction: 'outbound', message: recapMsg },
            { expectedTenantId: tenant.id },
          )
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
