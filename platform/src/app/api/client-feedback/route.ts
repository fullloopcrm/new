/**
 * Public tenant-customer feedback submission (tenant resolved from host).
 * Ported from nycmaid's /api/feedback (commits 1185a66e, 78e3b2db,
 * e1856912), adapted to fullloopcrm multi-tenancy — every write is
 * tenant_id-scoped instead of assuming a single business.
 *
 * Distinct from /api/feedback (platform product feedback about FullLoop CRM
 * itself). This is a tenant's own customer giving feedback about their
 * service — reachable without login, tagged client/anonymous/unmatched, and
 * surfaced under Clients -> Feedback.
 */
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { notify } from '@/lib/notify'

export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Unknown tenant' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-feedback:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({}))
  const { message, source, name, phone, sms_consent, anonymous } = body

  if (!message || typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const isAnonymous = Boolean(anonymous) || (!name && !phone)
  const cleanMessage = message.trim().slice(0, 2000)

  let clientId: string | null = null
  let category: 'client' | 'anonymous' | 'unmatched' = 'unmatched'

  if (isAnonymous) {
    category = 'anonymous'
  } else if (phone) {
    const last10 = String(phone).replace(/\D/g, '').slice(-10)
    const { data: match } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('tenant_id', tenant.id)
      .ilike('phone', `%${last10}%`)
      .limit(1)
      .maybeSingle()
    if (match) {
      clientId = match.id
      category = 'client'
      if (sms_consent) {
        await supabaseAdmin
          .from('clients')
          .update({ sms_consent: true })
          .eq('id', match.id)
          .eq('tenant_id', tenant.id)
      }
    }
  }

  const { error } = await supabaseAdmin.from('client_feedback').insert({
    tenant_id: tenant.id,
    client_id: clientId,
    campaign_id: null,
    source: source || 'web',
    message: cleanMessage,
    category,
    is_anonymous: category === 'anonymous',
    submitted_name: category === 'unmatched' ? (name?.trim() || null) : null,
    submitted_phone: category === 'unmatched' ? (String(phone || '').trim() || null) : null,
  })

  if (error) {
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
  }

  const identityLine = category === 'anonymous' ? 'Anonymous' : (name?.trim() || phone || 'Unmatched submitter')
  await notify({
    tenantId: tenant.id,
    type: 'client_feedback',
    title: `Feedback from ${identityLine}`,
    message: cleanMessage.slice(0, 300),
  }).catch(() => {})

  return NextResponse.json({ success: true })
}
