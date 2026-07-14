import { NextRequest, NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabaseAdmin } from '@/lib/supabase'
import { askSelena } from '@/lib/selena/agent'
import { decryptSecret } from '@/lib/secret-crypto'
import { sendEmail as sendTenantEmail } from '@/lib/email'
import { emailShell } from '@/lib/messaging/shell'
import { sendEmail as sendNycmaidEmail } from '@/lib/nycmaid/email'
import { safeEqual } from '@/lib/secret-compare'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const maxDuration = 60

const CRON_SECRET = (process.env.CRON_SECRET || '').trim()
export const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const NYCMAID_EMAIL_FROM = 'The NYC Maid <hi@thenycmaid.com>'

type Brand = { name: string; phone?: string | null; email?: string | null; address?: string | null; logoUrl?: string | null; primaryColor?: string | null }

// One mailbox to poll — either a tenant's saved IMAP profile, or the nycmaid
// env fallback (so nycmaid keeps working before its profile fields are set).
type MailAccount = {
  tenantId: string
  host: string
  port: number
  user: string
  pass: string
  resendApiKey: string | null // tenant Resend → branded reply; null → nycmaid fallback
  emailFrom: string | null
  brand: Brand
}

export async function collectAccounts(): Promise<MailAccount[]> {
  const accounts: MailAccount[] = []

  // Per-tenant: every tenant that has saved IMAP creds in its profile.
  const { data: tenants } = await supabaseAdmin
    .from('tenants')
    .select('id, name, phone, email, address, logo_url, primary_color, imap_host, imap_user, imap_pass, imap_port, resend_api_key, email_from')
    .not('imap_host', 'is', null)
    .not('imap_user', 'is', null)
    .not('imap_pass', 'is', null)

  for (const t of tenants || []) {
    try {
      accounts.push({
        tenantId: t.id,
        host: String(t.imap_host).trim(),
        port: t.imap_port || 993,
        user: String(t.imap_user).trim(),
        pass: decryptSecret(String(t.imap_pass)).trim(),
        resendApiKey: t.resend_api_key || null,
        // nycmaid must never fall through to the generic tenant-email default
        // (Full Loop CRM <hello@fullloopcrm.com>) even if its profile row is
        // migrated to Resend before email_from is set — its real from-address
        // is hi@thenycmaid.com, matching the source production repo.
        emailFrom: t.email_from || (t.id === NYCMAID_TENANT_ID ? NYCMAID_EMAIL_FROM : null),
        brand: {
          name: t.name || 'Full Loop',
          phone: t.phone,
          email: t.email_from || t.email,
          address: t.address,
          logoUrl: t.logo_url,
          primaryColor: t.primary_color,
        },
      })
    } catch {
      // Bad/undecryptable creds for one tenant must not sink the whole run.
    }
  }

  // nycmaid env fallback — only if it isn't already covered by a profile entry.
  const envPass = (process.env.EMAIL_PASS || '').trim()
  if (envPass && !accounts.some((a) => a.tenantId === NYCMAID_TENANT_ID)) {
    accounts.push({
      tenantId: NYCMAID_TENANT_ID,
      host: (process.env.EMAIL_HOST || 'mail.thenycmaid.com').trim(),
      port: 993,
      user: (process.env.EMAIL_USER || 'hi@thenycmaid.com').trim(),
      pass: envPass,
      resendApiKey: null,
      emailFrom: null,
      brand: { name: 'The NYC Maid' },
    })
  }

  return accounts
}

// Send a Yinez auto-reply on the account's own channel. Tenant accounts get the
// branded emailShell via their Resend; the nycmaid env fallback keeps its old path.
async function sendReply(
  account: MailAccount,
  to: string,
  subject: string,
  text: string,
): Promise<string | null> {
  const bodyHtml = text
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px">${escapeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('')
  if (account.resendApiKey) {
    const html = emailShell({ brand: account.brand, heading: subject, bodyHtml })
    const res = await sendTenantEmail({
      to,
      subject,
      html,
      from: account.emailFrom || undefined,
      resendApiKey: account.resendApiKey,
    })
    return (res as { id?: string } | null)?.id ?? null
  }
  // nycmaid env fallback — unchanged behaviour.
  const html = `<div style="font-family:system-ui,sans-serif;white-space:pre-wrap;font-size:14px;line-height:1.5">${escapeHtml(text)}</div>`
  const send = await sendNycmaidEmail(to, subject, html, undefined, { skipOwnerBcc: true })
  return send?.success ? ((send.data as { id?: string } | undefined)?.id || null) : null
}

async function pollAccount(account: MailAccount): Promise<{ scanned: number; mirrored: number; skipped: number }> {
  const { tenantId, user } = account
  let mirrored = 0
  let skipped = 0
  let scanned = 0

  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: true,
    auth: { user, pass: account.pass },
    logger: false,
    socketTimeout: 30_000,
  })

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
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

        const { data: existing } = await supabaseAdmin
          .from('comhub_messages')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('external_id', messageId)
          .eq('channel', 'email')
          .limit(1)
        if (existing && existing.length > 0) { skipped++; continue }

        const fromAddr = parsed.from?.value?.[0]?.address || ''
        const fromName = parsed.from?.value?.[0]?.name || null
        if (!fromAddr) { skipped++; continue }
        if (fromAddr.toLowerCase() === user.toLowerCase()) { skipped++; continue }

        const { data: contactId, error: cErr } = await supabaseAdmin
          .rpc('comhub_get_or_create_contact_by_email', { p_tenant_id: tenantId, p_email: fromAddr, p_name: fromName })
        if (cErr || !contactId) { skipped++; continue }
        const { data: threadId, error: tErr } = await supabaseAdmin
          .rpc('comhub_get_or_create_thread', { p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'email' })
        if (tErr || !threadId) { skipped++; continue }

        const subject = parsed.subject || ''
        const text = parsed.text || (typeof parsed.html === 'string' ? parsed.html.replace(/<[^>]+>/g, ' ').slice(0, 8000) : '')
        const sentAt = parsed.date ? parsed.date.toISOString() : new Date().toISOString()

        await supabaseAdmin.from('comhub_messages').insert({
          tenant_id: tenantId,
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

        // ── Yinez auto-reply ─────────────────────────────────────────────────
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
            .eq('tenant_id', tenantId)
            .ilike('email', fromAddr)
            .limit(1)
            .single()
          if (!paused && !dnsClient?.do_not_service) {
            const result = await askSelena('email', text || subject || '', threadId as string, undefined)
            if (result.text) {
              const replySubject = subject ? `Re: ${subject.replace(/^(re:\s*)+/i, '')}` : '(no subject)'
              const externalId = await sendReply(account, fromAddr, replySubject, result.text)
              if (externalId !== null || account.resendApiKey) {
                const { data: outMsg } = await supabaseAdmin
                  .from('comhub_messages')
                  .insert({
                    tenant_id: tenantId,
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
                  .eq('tenant_id', tenantId)
                  .eq('id', threadId as string)
              }
            }
          }
        } catch {
          // Best-effort — never let Yinez auto-reply break the IMAP poll.
        }

        const { data: cur } = await supabaseAdmin
          .from('comhub_threads')
          .select('unread_count')
          .eq('tenant_id', tenantId)
          .eq('id', threadId)
          .single()
        await supabaseAdmin
          .from('comhub_threads')
          .update({
            subject: subject || undefined,
            last_message_at: sentAt,
            last_message_preview: (subject ? subject + ' — ' : '') + text.slice(0, 120),
            unread_count: (cur?.unread_count ?? 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('tenant_id', tenantId)
          .eq('id', threadId)

        mirrored++
      }
    } finally {
      lock.release()
    }
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return { scanned, mirrored, skipped }
}

// GET /api/cron/comhub-email
// Polls every tenant's IMAP inbox (profile creds) + the nycmaid env fallback,
// mirroring new mail into comhub_messages (tenant-scoped, deduped by Message-ID).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const url = new URL(req.url)
  const querySecret = url.searchParams.get('secret') || ''
  const ok = (CRON_SECRET && (safeEqual(authHeader, `Bearer ${CRON_SECRET}`) || safeEqual(querySecret, CRON_SECRET)))
            || req.headers.get('x-vercel-cron') === '1'
  if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const accounts = await collectAccounts()
  if (accounts.length === 0) return NextResponse.json({ error: 'no mailboxes configured' }, { status: 500 })

  let scanned = 0, mirrored = 0, skipped = 0
  const perTenant: Array<{ tenant: string; scanned: number; mirrored: number; skipped: number; error?: string }> = []
  for (const account of accounts) {
    try {
      const r = await pollAccount(account)
      scanned += r.scanned; mirrored += r.mirrored; skipped += r.skipped
      perTenant.push({ tenant: account.tenantId, ...r })
    } catch (e) {
      // One tenant's IMAP failure must not stop the others.
      perTenant.push({ tenant: account.tenantId, scanned: 0, mirrored: 0, skipped: 0, error: e instanceof Error ? e.message : String(e) })
    }
  }

  return NextResponse.json({ ok: true, mailboxes: accounts.length, scanned, mirrored, skipped, perTenant })
}
