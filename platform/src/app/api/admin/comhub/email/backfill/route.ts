import { NextRequest, NextResponse } from 'next/server'
import { ImapFlow } from 'imapflow'
import { simpleParser } from 'mailparser'
import { supabaseAdmin } from '@/lib/supabase'
import { requireAdmin } from '@/lib/require-admin'
import { getCurrentTenantId } from '@/lib/tenant'
import { decryptSecret } from '@/lib/secret-crypto'

export const maxDuration = 300

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'

interface MailAccount {
  host: string
  port: number
  user: string
  pass: string
}

// Resolve the CALLING tenant's own mailbox — same per-tenant profile fields
// + nycmaid env fallback as the cron job's collectAccounts()
// (src/app/api/cron/comhub-email/route.ts) — instead of always using the
// hardcoded global EMAIL_HOST/USER/PASS env vars regardless of which tenant
// is impersonated. That mismatch let this route mirror nycmaid's mailbox
// into whatever other tenant happened to be active.
async function resolveTenantMailAccount(tenantId: string): Promise<MailAccount | null> {
  const { data: tenant } = await supabaseAdmin
    .from('tenants')
    .select('imap_host, imap_user, imap_pass, imap_port')
    .eq('id', tenantId)
    .maybeSingle()

  if (tenant?.imap_host && tenant?.imap_user && tenant?.imap_pass) {
    try {
      return {
        host: String(tenant.imap_host).trim(),
        port: tenant.imap_port || 993,
        user: String(tenant.imap_user).trim(),
        pass: decryptSecret(String(tenant.imap_pass)).trim(),
      }
    } catch {
      return null
    }
  }

  if (tenantId === NYCMAID_TENANT_ID) {
    const envPass = (process.env.EMAIL_PASS || '').trim()
    if (!envPass) return null
    return {
      host: (process.env.EMAIL_HOST || 'mail.thenycmaid.com').trim(),
      port: 993,
      user: (process.env.EMAIL_USER || 'hi@thenycmaid.com').trim(),
      pass: envPass,
    }
  }

  return null
}

// POST /api/admin/comhub/email/backfill?days=90
// Deep IMAP sweep — populates comhub_messages with historical email for the
// active tenant's OWN mailbox. Idempotent (dedupes by Message-ID + channel='email').
export async function POST(req: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError
  const tenantId = await getCurrentTenantId()

  const url = new URL(req.url)
  const days = Math.max(1, Math.min(parseInt(url.searchParams.get('days') || '90', 10) || 90, 365))

  const account = await resolveTenantMailAccount(tenantId)
  if (!account) return NextResponse.json({ error: 'No IMAP mailbox configured for this tenant' }, { status: 500 })
  const { host, port, user, pass } = account

  const client = new ImapFlow({
    host, port, secure: true,
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
