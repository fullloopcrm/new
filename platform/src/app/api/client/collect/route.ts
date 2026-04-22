import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { notify } from '@/lib/notify'
import { emailAdmins } from '@/lib/admin-contacts'
import { adminNewClientEmail } from '@/lib/email-templates'
import { attributeCollectForm } from '@/lib/attribution'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { randomInt } from 'crypto'

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

    const cleanPhone = phone.replace(/\D/g, '')
    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id, status')
      .eq('tenant_id', tenant.id)
      .or(`phone.ilike.%${cleanPhone.slice(-10)}%`)
      .limit(1)
    const existingClient = existing?.[0]

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
        .ilike('name', `%${referrer_name.trim()}%`)
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
    if (convo_id) {
      try {
        await supabaseAdmin
          .from('sms_conversations')
          .update({
            client_id: data.id,
            state: 'form_received',
            updated_at: new Date().toISOString(),
          })
          .eq('id', convo_id)
          .eq('tenant_id', tenant.id)
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
