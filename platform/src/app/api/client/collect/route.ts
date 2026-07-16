import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { emailAdmins } from '@/lib/admin-contacts'
import { adminNewClientEmail } from '@/lib/email-templates'
import { attributeCollectForm } from '@/lib/attribution'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { randomInt } from 'crypto'

// National (US) 10-digit number with an optional leading country-code '1'
// stripped from either side -- returns null for anything shorter (a short or
// malformed phone must never resolve to an existing client).
function normalizePhoneDigits(raw: string): string | null {
  const digits = raw.replace(/\D/g, '')
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  return national.length === 10 ? national : null
}

// Escapes ilike wildcard metacharacters in user-supplied text before it is
// embedded in a %pattern%. Without this, a referrer_name of e.g. "%" matches
// EVERY active referrer (first row returned wins), misattributing a stranger's
// booking -- and its commission -- to an arbitrary real referrer.
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const rl = await rateLimitDb(`client-collect:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
    if (!rl.allowed) {
      return NextResponse.json({ error: 'Too many submissions. Please wait a few minutes.' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const {
      name, email, phone, address, notes,
      referrer_name, referrer_phone, src, convo_id, pet_name, pet_type,
    } = body as Record<string, string | undefined>

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    // Existing client match must be a FULL, exact digit match -- a
    // substring/suffix ilike here let a short or malformed phone (e.g. "5")
    // match an ARBITRARY unrelated client, silently overwriting their
    // name/email/address/notes/status below. Mirrors client/check.
    const normalizedPhone = normalizePhoneDigits(phone)
    let existingClient: { id: string; status: string } | undefined
    if (normalizedPhone) {
      const { data: candidates } = await supabaseAdmin
        .from('clients')
        .select('id, status, phone')
        .eq('tenant_id', tenant.id)
      existingClient = candidates?.find((c) => normalizePhoneDigits(c.phone || '') === normalizedPhone)
    }

    // Referrer resolution (tenant-scoped)
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
          await notify({
            tenantId: tenant.id,
            type: 'referral_lead',
            title: 'New Referrer Lead',
            message: `${referrer_name || 'Unknown'} (${referrer_phone}) referred ${name} — not in system.`,
          }).catch(() => {})
        }
      }
    } else if (referrer_name) {
      const { data: byName } = await supabaseAdmin
        .from('referrers')
        .select('id')
        .eq('tenant_id', tenant.id)
        .ilike('name', `%${escapeLike(referrer_name.trim())}%`)
        .eq('active', true)
        .limit(1)
      if (byName && byName.length > 0) {
        referrerId = byName[0].id
      } else {
        await notify({
          tenantId: tenant.id,
          type: 'referral_lead',
          title: 'New Referrer Lead',
          message: `${referrer_name} referred ${name} — not in system.`,
        }).catch(() => {})
      }
    }

    const referralInfo = referrer_name ? `${referrer_name}${referrer_phone ? ` (${referrer_phone})` : ''}` : null
    const clientNotes = referralInfo && !referrerId
      ? `Referral: ${referralInfo}${notes ? `\n${notes}` : ''}`
      : notes || null
    const notesValue = src ? `Source: ${src}${clientNotes ? `\n${clientNotes}` : ''}` : clientNotes

    let data: { id: string; [k: string]: unknown }

    if (existingClient) {
      const { data: updated, error } = await supabaseAdmin
        .from('clients')  // tenant-scope-ok: tenant-scoped (id + tenant_id filter just below)
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
      if (error || !updated) throw error || new Error('update failed')
      data = updated as typeof data
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
          pin: String(100000 + randomInt(0, 900000)),
        })
        .select()
        .single()
      if (error || !inserted) throw error || new Error('insert failed')
      data = inserted as typeof data
    }

    await notify({
      tenantId: tenant.id,
      type: 'new_client',
      title: 'New Client Collected',
      message: `${name}${src ? ` • from ${src}` : ''}${referralInfo ? ` (Ref: ${referralInfo})` : ''} • via Collect Form`,
    }).catch(() => {})

    // Admin email
    try {
      const td = {
        tenantName: tenant.name,
        primaryColor: tenant.primary_color || undefined,
        logoUrl: tenant.logo_url || undefined,
      }
      const adminEmail = adminNewClientEmail(
        {
          name,
          phone,
          email,
          address,
          notes: clientNotes || undefined,
          referralInfo: referralInfo || undefined,
          referrerMatched: !!referrerId,
        },
        td,
      )
      await emailAdmins(tenant, adminEmail.subject, adminEmail.html)
    } catch (emailErr) {
      console.error('Collect email error:', emailErr)
    }

    // Attribution
    if (address) {
      try {
        await attributeCollectForm(tenant.id, name, address, data.id)
      } catch (attrErr) {
        console.error('Collect attribution error:', attrErr)
      }
    }

    // SMS conversation handoff — lightweight: link convo to client, mark form received.
    // The tenant-specific recap message (pricing, payment instructions) lives in Selena,
    // not here. Selena will send the next appropriate message on its next turn.
    //
    // convo_id is a caller-supplied URL param (from the "finish your booking"
    // SMS link) with no session tied to it -- the tenant_id filter below only
    // confines the lookup to this tenant, so without also checking the
    // conversation's own phone against the phone the submitter just typed,
    // anyone who obtained another customer's convo_id (a forwarded link,
    // browser history, a link-preview crawler) could hijack that
    // conversation and reassign it to an attacker-controlled client.
    if (convo_id) {
      try {
        const { data: convo } = await supabaseAdmin
          .from('sms_conversations')
          .select('phone')
          .eq('id', convo_id)
          .eq('tenant_id', tenant.id)
          .is('completed_at', null)
          .single()

        if (convo && normalizedPhone && normalizePhoneDigits(convo.phone || '') === normalizedPhone) {
          // Re-check completed_at IS NULL — without this, a conversation
          // completed by another process between the SELECT above and this
          // UPDATE would be silently reopened and reassigned.
          await supabaseAdmin
            .from('sms_conversations')
            .update({
              client_id: data.id,
              state: 'form_received',
              updated_at: new Date().toISOString(),
            })
            .eq('id', convo_id)
            .eq('tenant_id', tenant.id)
            .is('completed_at', null)
        }
      } catch (e) {
        console.error('Conversation link error:', e)
      }
    }

    return NextResponse.json({ success: true, client_id: data.id })
  } catch (err) {
    console.error('Client collect error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
