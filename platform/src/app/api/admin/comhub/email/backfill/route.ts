import { NextRequest, NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'

export const maxDuration = 300

// POST /api/admin/comhub/email/backfill?days=90
// Deep IMAP sweep — populates comhub_messages with historical email for the
// active tenant. Idempotent (dedupes by Message-ID + channel='email').
// IMAP credentials currently env-based; per-tenant IMAP not yet wired.
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const url = new URL(req.url)
  const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '90', 10) || 90, 365))

  const host = (process.env.EMAIL_HOST || '').trim()
  const user = (process.env.EMAIL_USER || '').trim()
  const pass = (process.env.EMAIL_PASS || '').trim()
  if (!host || !user || !pass) return NextResponse.json({ error: 'EMAIL_HOST/USER/PASS not set' }, { status: 500 })

  const client = new ImapFlow({
    host, port: 993, secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 60_000,
  })

  let mirrored = 0
  let skipped = 0
  let scanned = 0
  const errors: string[] = []

  await client.connect()
  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const search = await client.search({ since }, { uid: true })
      const uids: number[] = Array.isArray(search) ? search : []
      const orderedUids = [...uids].sort((a, b) => b - a)

      for (const uid of orderedUids) {
        scanned++
        try {
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

          const isOutbound = fromAddr.toLowerCase() === user.toLowerCase()
          if (isOutbound) { skipped++; continue }

          const { data: contactId, error: cErr } = await supabaseAdmin
            .rpc('comhub_get_or_create_contact_by_email', {
              p_tenant_id: tenantId, p_email: fromAddr, p_name: fromName,
            })
          if (cErr || !contactId) { skipped++; continue }
          const { data: threadId, error: tErr } = await supabaseAdmin
            .rpc('comhub_get_or_create_thread', {
              p_tenant_id: tenantId, p_contact_id: contactId, p_channel: 'email',
            })
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
          mirrored++
        } catch (err) {
          errors.push(`uid=${uid}: ${(err as Error).message}`.slice(0, 200))
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    try { await client.logout() } catch { /* ignore */ }
  }

  return NextResponse.json({ ok: true, days, scanned, mirrored, skipped, errors: errors.slice(0, 5) })
}
