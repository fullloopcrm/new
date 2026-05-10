import { NextRequest, NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabaseAdmin } from '@/lib/supabase'
import { askYinez } from '@/lib/yinez/agent'
import { sendEmail } from '@/lib/nycmaid/email'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export const maxDuration = 60

const CRON_SECRET = (process.env.CRON_SECRET || '').trim()

// GET /api/cron/comhub-email
// Polls IMAP for new mail and mirrors each message into comhub_messages.
// Idempotent — dedupes by Message-ID via comhub_messages.external_id.
// Independent of the existing payment monitor; we don't mark Seen so the
// payment monitor still runs against the same inbox unchanged.
export async function GET(req: NextRequest) {
  // Allow Vercel cron header OR ?secret=
  const authHeader = req.headers.get('authorization') || ''
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret') || ''
  const ok = (CRON_SECRET && (authHeader === `Bearer ${CRON_SECRET}` || querySecret === CRON_SECRET))
            || req.headers.get('x-vercel-cron') === '1'
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const host = (process.env.EMAIL_HOST || 'mail.thenycmaid.com').trim()
  const user = (process.env.EMAIL_USER || 'hi@thenycmaid.com').trim()
  const pass = (process.env.EMAIL_PASS || '').trim()
  if (!pass) return NextResponse.json({ error: 'EMAIL_PASS not set' }, { status: 500 })

  const client = new ImapFlow({
    host, port: 993, secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 30_000,
  })

  // Bind to nycmaid tenant — IMAP source is nycmaid's hi@thenycmaid.com.
  // Other tenants need their own per-tenant IMAP wiring (separate cron).
  const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
  const tid = NYCMAID_TENANT_ID

  let mirrored = 0
  let skipped = 0
  let scanned = 0

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      // Fetch by date — last 6 hours — so dropped cron runs don't lose mail.
      // Doesn't depend on Seen flag (payment monitor may toggle it).
      // Dedup is by Message-ID so re-fetching is safe.
      const since = new Date(Date.now() - 6 * 60 * 60 * 1000)
      const search = await client.search({ since }, { uid: true })
      const uids: number[] = Array.isArray(search) ? search : []
      for (const uid of uids.slice(-50)) {
        scanned++
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true })
        if (!msg || typeof msg === 'boolean' || !msg.source) { skipped++; continue }
        const parsed = await simpleParser(msg.source)
        const messageId = parsed.messageId || ''
        if (!messageId) { skipped++; continue }

        // Already mirrored?
        const { data: existing } = await supabaseAdmin
          .from('comhub_messages')
          .select('id')
          .eq('external_id', messageId)
          .eq('channel', 'email')
          .limit(1)
        if (existing && existing.length > 0) { skipped++; continue }

        const fromAddr = parsed.from?.value?.[0]?.address || ''
        const fromName = parsed.from?.value?.[0]?.name || null
        if (!fromAddr) { skipped++; continue }

        // Skip our own outbound (Resend echoes can come back via list-mail).
        if (fromAddr.toLowerCase() === user.toLowerCase()) { skipped++; continue }

        // Get/create contact, then thread.
        const { data: contactId, error: cErr } = await supabaseAdmin
          .rpc('comhub_get_or_create_contact_by_email', { p_email: fromAddr, p_name: fromName })
        if (cErr || !contactId) { skipped++; continue }
        const { data: threadId, error: tErr } = await supabaseAdmin
          .rpc('comhub_get_or_create_thread', { p_contact_id: contactId, p_channel: 'email' })
        if (tErr || !threadId) { skipped++; continue }

        const subject = parsed.subject || ''
        const text = parsed.text || (typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ').slice(0, 8000) : '')
        const sentAt = parsed.date ? parsed.date.toISOString() : new Date().toISOString()

        await supabaseAdmin.from('comhub_messages').insert({
          tenant_id: tid,
          thread_id: threadId,
          contact_id: contactId,
          channel: 'email',
          direction: 'in',
          author: 'customer',
          subject,
          body: text,
          from_address: fromAddr,
          to_address: user,
          external_id: messageId,
          sent_at: sentAt,
        })

        // ── Yinez auto-reply on email leads ─────────────────────────────────
        // Skip if admin has taken over the thread, or if the contact is
        // marked do-not-service (clients table).
        try {
          const { data: thread } = await supabaseAdmin
            .from('comhub_threads')
            .select('bot_paused_until')
            .eq('id', threadId as string)
            .single()
          const paused = thread?.bot_paused_until && new Date(thread.bot_paused_until) > new Date()
          const { data: dnsClient } = await supabaseAdmin
            .from('clients')
            .select('do_not_service')
            .ilike('email', fromAddr)
            .limit(1)
            .single()
          if (paused || dnsClient?.do_not_service) {
            // Skip Yinez auto-reply.
          } else {
            const result = await askYinez('email', text || subject || '', threadId as string, undefined)
            if (result.text) {
              const replySubject = subject ? `Re: ${subject.replace(/^(re:\s*)+/i, '')}` : '(no subject)'
              const html = `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(result.text)}</div>`
              const send = await sendEmail(fromAddr, replySubject, html, undefined, { skipOwnerBcc: true })
              if (send.success) {
                const externalId = (send.data as { id?: string } | undefined)?.id || null
                const { data: outMsg } = await supabaseAdmin
                  .from('comhub_messages')
                  .insert({
                    tenant_id: tid,
                    thread_id: threadId,
                    contact_id: contactId,
                    channel: 'email',
                    direction: 'auto',
                    author: 'yinez',
                    subject: replySubject,
                    body: result.text,
                    from_address: user,
                    to_address: fromAddr,
                    external_id: externalId,
                    metadata: {
                      tools_called: result.toolsCalled || [],
                      escalated: !!result.escalated,
                      booking_created: !!result.bookingCreated,
                    },
                    sent_at: new Date().toISOString(),
                  })
                  .select()
                  .single()
                await supabaseAdmin
                  .from('comhub_threads')
                  .update({
                    last_message_at: outMsg?.sent_at || new Date().toISOString(),
                    last_message_preview: (replySubject + ' — ' + result.text).slice(0, 140),
                    updated_at: new Date().toISOString(),
                  })
                  .eq('tenant_id', tid)
                  .eq('id', threadId as string)
              }
            }
          }
        } catch {
          // Best-effort — never let Yinez auto-reply break the IMAP poll.
        }

        await supabaseAdmin
          .from('comhub_threads')
          .update({
            subject: subject || undefined,
            last_message_at: sentAt,
            last_message_preview: (subject ? subject + ' — ' : '') + text.slice(0, 120),
            unread_count: (await supabaseAdmin
              .from('comhub_threads')
              .select('unread_count')
              .eq('tenant_id', tid)
              .eq('id', threadId)
              .single()).data?.unread_count != null
              ? ((await supabaseAdmin
                  .from('comhub_threads')
                  .select('unread_count')
                  .eq('tenant_id', tid)
                  .eq('id', threadId)
                  .single()).data!.unread_count + 1)
              : 1,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tid)
          .eq('id', threadId)

        mirrored++
      }
    } finally {
      lock.release()
    }
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, scanned, mirrored, skipped })
}
