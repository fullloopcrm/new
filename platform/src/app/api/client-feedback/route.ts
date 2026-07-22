import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { emailAdmins, smsAdmins } from '@/lib/nycmaid/admin-contacts'
import { matchInboundPhone } from '@/lib/nycmaid/client-contacts'
import { notify } from '@/lib/notify'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { getTenantFromHeaders } from '@/lib/tenant-site'
import { escapeHtml } from '@/lib/escape-html'
import { trackError } from '@/lib/error-tracking'

// Tenant-aware port from nycmaid (originally /api/feedback there — renamed
// here because /api/feedback in FullLoop is already the unrelated
// platform-feedback system: SaaS product feedback from tenant businesses).
// Public, unauthenticated client feedback submission. Every submission lands
// in client_feedback (the single Clients -> Feedback system-of-record),
// tagged by category:
//   'client'    — phone matched an existing client (also fed into
//                 Yinez's per-client memory)
//   'anonymous' — submitter checked "prefer to stay anonymous"
//   'unmatched' — gave a name/phone but it didn't match any client on file
export async function POST(request: Request) {
  const tenant = await getTenantFromHeaders()
  if (!tenant) return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rl = await rateLimitDb(`client-feedback:${tenant.id}:${ip}`, 3, 10 * 60 * 1000)
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many submissions. Try again later.' }, { status: 429 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const { message, source, name, phone, sms_consent } = body as {
    message?: string; source?: string; name?: string; phone?: string; sms_consent?: boolean
  }

  if (!message || !message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  const isAnonymous = !name && !phone
  // Plain-text version (SMS, subject line) — no HTML escaping needed.
  const identityLine = isAnonymous
    ? 'Anonymous'
    : [name || null, phone || null].filter(Boolean).join(' · ') + (phone ? (sms_consent ? ' (SMS consent given)' : ' (no SMS consent)') : '')

  // HTML-safe version for the email body — name/source are user-controlled
  // and were previously interpolated unescaped (HTML-injectable into the
  // admin alert email).
  const identityLineHtml = isAnonymous
    ? 'Anonymous'
    : [name, phone].filter(Boolean).map(escapeHtml).join(' · ') + (phone ? (sms_consent ? ' (SMS consent given)' : ' (no SMS consent)') : '')

  const html = `
    <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto;">
      <h2 style="color: #000; margin: 0 0 16px 0;">Feedback</h2>
      <p style="color: #666; font-size: 14px; margin: 0 0 4px 0;">From: ${identityLineHtml}</p>
      <p style="color: #666; font-size: 14px; margin: 0 0 24px 0;">Source: ${escapeHtml(source || 'Unknown')}</p>
      <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 0 0 24px 0;">
        <p style="color: #000; font-size: 15px; line-height: 1.6; margin: 0; white-space: pre-wrap;">${escapeHtml(message)}</p>
      </div>
      <p style="color: #999; font-size: 12px; margin: 0;">Submitted ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET</p>
    </div>
  `

  try {
    await emailAdmins(`Feedback: ${identityLine}`, html)

    const truncated = message.trim().length > 100 ? message.trim().slice(0, 100) + '...' : message.trim()
    // Was hardcoded to Jeff's personal number — smsAdmins() pulls the
    // tenant's own owner_phone (Telegram-first, SMS fallback), consistent
    // with how emailAdmins() already resolves the recipient.
    await smsAdmins(`The NYC Maid Feedback (${identityLine}): ${truncated}`)

    let linkedClientId: string | null = null
    let category: 'client' | 'anonymous' | 'unmatched' = 'unmatched'
    if (isAnonymous) {
      category = 'anonymous'
    } else if (phone) {
      const match = await matchInboundPhone(phone)
      if (match?.client_id) {
        linkedClientId = match.client_id
        category = 'client'
        const { error: memErr } = await supabaseAdmin.from('yinez_memory').insert({
          tenant_id: tenant.id,
          client_id: match.client_id,
          type: 'observation',
          content: message.trim().slice(0, 1000),
          source: 'feedback_form',
        })
        // Best-effort — Yinez memory is a nice-to-have enrichment, not the
        // system-of-record. Log it so a real failure isn't invisible, but
        // don't fail the request over it.
        if (memErr) await trackError(memErr, { source: 'api/client-feedback:yinez_memory', tenantId: tenant.id, severity: 'low' })
      }
    }

    // client_feedback IS the system-of-record for this submission — unlike
    // the memory insert above, a failure here means the feedback is lost
    // even though the admin alert already fired. Track it as high severity
    // (not silently swallowed) but still return success to the submitter,
    // since the alert genuinely did go out.
    const { error: feedbackErr } = await supabaseAdmin.from('client_feedback').insert({
      tenant_id: tenant.id,
      client_id: linkedClientId,
      campaign_id: null,
      source: 'web',
      message: message.trim().slice(0, 2000),
      credit_cents: null,
      is_anonymous: category === 'anonymous',
      category,
      submitted_name: category === 'unmatched' ? (name || null) : null,
      submitted_phone: category === 'unmatched' ? (phone || null) : null,
    })
    if (feedbackErr) await trackError(feedbackErr, { source: 'api/client-feedback:insert', tenantId: tenant.id, severity: 'high' })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Feedback email error:', err)
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 })
  }
}
