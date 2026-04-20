/**
 * IMAP email monitor — ported from nycmaid (2026-04-19), tenant-aware.
 * Each tenant configures their own IMAP credentials in tenants.imap_*.
 */
import { ImapFlow } from 'imapflow'
import { simpleParser, ParsedMail } from 'mailparser'

export interface ParsedEmail {
  uid: number
  from: string
  fromName: string
  subject: string
  text: string
  html: string
  date: Date
  messageId: string
}

export interface ImapConfig {
  host: string
  port?: number
  user: string
  pass: string
}

function makeClient(cfg: ImapConfig): ImapFlow {
  return new ImapFlow({
    host: cfg.host,
    port: cfg.port || 993,
    secure: true,
    auth: { user: cfg.user, pass: cfg.pass },
    logger: false,
  })
}

export async function fetchUnreadEmails(cfg: ImapConfig, limit = 20): Promise<ParsedEmail[]> {
  const client = makeClient(cfg)
  const emails: ParsedEmail[] = []

  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')

    try {
      const searchResult = await client.search({ seen: false }, { uid: true })
      const uids = Array.isArray(searchResult) ? searchResult : []
      if (!uids.length) return emails

      const recentUids = uids.slice(-limit)
      for (const uid of recentUids) {
        const msg = await client.fetchOne(String(uid), { source: true }, { uid: true })
        if (!msg || typeof msg === 'boolean' || !msg.source) continue

        const parsed: ParsedMail = await simpleParser(msg.source)
        emails.push({
          uid,
          from: parsed.from?.value?.[0]?.address || '',
          fromName: parsed.from?.value?.[0]?.name || '',
          subject: parsed.subject || '',
          text: parsed.text || '',
          html: typeof parsed.html === 'string' ? parsed.html : '',
          date: parsed.date || new Date(),
          messageId: parsed.messageId || '',
        })
      }
    } finally {
      lock.release()
    }
    await client.logout()
  } catch (err) {
    console.error('[imap] fetch error:', err)
    try { await client.logout() } catch {}
  }

  return emails
}

export async function markEmailRead(cfg: ImapConfig, uid: number): Promise<void> {
  const client = makeClient(cfg)
  try {
    await client.connect()
    const lock = await client.getMailboxLock('INBOX')
    try {
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
    } finally {
      lock.release()
    }
    await client.logout()
  } catch (err) {
    console.error('[imap] mark-read error:', err)
    try { await client.logout() } catch {}
  }
}
