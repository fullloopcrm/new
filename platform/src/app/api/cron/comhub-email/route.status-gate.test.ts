import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * comhub-email cron — tenantServesSite() status gate.
 *
 * Same bug class as every other slug/host/phone-resolved entry point fixed
 * this session (Telegram, Telnyx SMS/voice webhooks): collectAccounts()
 * pulled every tenant with saved IMAP creds and polled/mirrored/auto-replied
 * without ever checking tenant status. Without this, a suspended/cancelled/
 * deleted tenant's mailbox kept getting polled, mirrored into
 * comhub_messages, and auto-replied to by Yinez indefinitely — inbound
 * email delivery has no dependency on the tenant's site/dashboard being
 * reachable.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const OTHER_TENANT_ID = 't-other'

const askSelenaCalls: string[] = []

vi.mock('imapflow', () => ({
  ImapFlow: class {
    async connect() {}
    async logout() {}
    async getMailboxLock() {
      return { release: () => {} }
    }
    async search() {
      return [1]
    }
    async fetchOne() {
      return { source: Buffer.from('raw-email') }
    }
  },
}))

vi.mock('mailparser', () => ({
  simpleParser: vi.fn(async () => ({
    messageId: '<msg-1@example.com>',
    from: { value: [{ address: 'lead@example.com', name: 'Lead Person' }] },
    subject: 'Question about cleaning',
    text: 'Do you clean on Sundays?',
    date: new Date('2026-07-13T12:00:00Z'),
  })),
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (_channel: string, _text: string, threadId: string) => {
    askSelenaCalls.push(threadId)
    return { text: 'Yes we do!', toolsCalled: [], escalated: false, bookingCreated: false }
  }),
}))

vi.mock('@/lib/secret-crypto', () => ({
  decryptSecret: (v: string) => v,
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => ({ id: 'sent-1' })),
}))

vi.mock('@/lib/messaging/shell', () => ({
  emailShell: () => '<html></html>',
}))

vi.mock('@/lib/nycmaid/email', () => ({
  sendEmail: vi.fn(async () => ({ success: true, data: { id: 'nm-sent-1' } })),
}))

type Row = Record<string, unknown>

let tenantsRows: Row[]
let threadRow: Row

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    not: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    ilike: () => chain,
    limit: () => chain,
    single: async () => {
      if (table === 'comhub_threads') return { data: threadRow, error: null }
      if (table === 'clients') return { data: { do_not_service: false }, error: null }
      if (table === 'tenants') {
        const match = tenantsRows.find((t) => t.id === eqs.id) || null
        return { data: match, error: null }
      }
      return { data: null, error: null }
    },
    update: () => chain,
    insert: () => chain,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') return resolve({ data: tenantsRows, error: null })
      if (table === 'comhub_messages') return resolve({ data: [], error: null })
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => builder(table),
    rpc: vi.fn(async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_email') return { data: 'contact-1', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    }),
  },
}))

process.env.CRON_SECRET = 'test-cron-secret'
const { GET } = await import('./route')

function req() {
  return new NextRequest('http://t/api/cron/comhub-email', {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
  })
}

beforeEach(() => {
  askSelenaCalls.length = 0
  threadRow = { bot_paused_until: null }
})

describe('comhub-email cron — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips polling a %s tenant\'s mailbox entirely, alongside an active tenant that still polls',
    async (status) => {
      tenantsRows = [
        {
          id: OTHER_TENANT_ID,
          name: 'Suspended Co',
          status,
          imap_host: 'mail.other.com',
          imap_user: 'hi@other.com',
          imap_pass: 'secret',
          imap_port: 993,
          resend_api_key: 're_key',
          email_from: 'hi@other.com',
        },
        {
          id: 't-active',
          name: 'Active Co',
          status: 'active',
          imap_host: 'mail.active.com',
          imap_user: 'hi@active.com',
          imap_pass: 'secret',
          imap_port: 993,
          resend_api_key: 're_key',
          email_from: 'hi@active.com',
        },
      ]

      const res = await GET(req())
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.mailboxes).toBe(1)
      expect(body.perTenant).toEqual([expect.objectContaining({ tenant: 't-active' })])
      expect(askSelenaCalls).toHaveLength(1)
    },
  )

  it.each(['active', 'setup', 'pending'])('still polls and auto-replies for a %s tenant', async (status) => {
    tenantsRows = [
      {
        id: OTHER_TENANT_ID,
        name: 'Other Co',
        status,
        imap_host: 'mail.other.com',
        imap_user: 'hi@other.com',
        imap_pass: 'secret',
        imap_port: 993,
        resend_api_key: 're_key',
        email_from: 'hi@other.com',
      },
    ]

    const res = await GET(req())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.mailboxes).toBe(1)
    expect(askSelenaCalls).toHaveLength(1)
  })

  it('still gates the nycmaid tenant via the env-fallback path when its tenant row is suspended', async () => {
    tenantsRows = [{ id: NYCMAID_TENANT_ID, status: 'suspended' }]
    const prevEmailPass = process.env.EMAIL_PASS
    process.env.EMAIL_PASS = 'env-pass'

    const res = await GET(req())

    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('no mailboxes configured')

    if (prevEmailPass === undefined) delete process.env.EMAIL_PASS
    else process.env.EMAIL_PASS = prevEmailPass
  })
})
