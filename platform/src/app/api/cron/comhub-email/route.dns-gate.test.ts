import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * comhub-email cron — DNS (do_not_service) gate on INBOUND mail.
 *
 * 2026-08-01: the pre-existing DNS check only skipped the Yinez auto-reply —
 * the inbound email still created a comhub_contact/thread/message and
 * surfaced as a normal ComHub conversation either way. A do_not_service
 * client must get zero ComHub presence, not just a silent bot.
 */

const TENANT_ID = 't-dns-test'

vi.mock('imapflow', () => ({
  ImapFlow: class {
    async connect() {}
    async logout() {}
    async getMailboxLock() { return { release: () => {} } }
    async search() { return [1] }
    async fetchOne() { return { source: Buffer.from('raw-email') } }
  },
}))

vi.mock('mailparser', () => ({
  simpleParser: vi.fn(async () => ({
    messageId: '<msg-dns-1@example.com>',
    from: { value: [{ address: 'dnsclient@example.com', name: 'DNS Client' }] },
    subject: 'Are you available?',
    text: 'Can you come clean tomorrow?',
    date: new Date('2026-08-01T12:00:00Z'),
    headers: new Map(),
  })),
}))

const askSelenaCalls: string[] = []
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (channel: string, text: string, threadId: string) => {
    askSelenaCalls.push(threadId)
    return { text: 'Yes!', toolsCalled: [], escalated: false, bookingCreated: false }
  }),
}))
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'sent-1' })) }))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '<html></html>' }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => ({ success: true, data: { id: 'nm-1' } })) }))

const contactCreateCalls: string[] = []
const messageInserts: Record<string, unknown>[] = []

function builder(table: string) {
  const chain = {
    select: () => chain,
    not: () => chain,
    eq: () => chain,
    ilike: () => chain,
    limit: () => chain,
    lt: () => chain,
    order: () => chain,
    single: async () => {
      if (table === 'clients') return { data: { do_not_service: true }, error: null }
      return { data: null, error: null }
    },
    update: () => chain,
    insert: (row: Record<string, unknown>) => {
      if (table === 'comhub_messages') messageInserts.push(row)
      return chain
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') {
        return resolve({
          data: [{
            id: TENANT_ID, name: 'Test Tenant', imap_host: 'mail.test.com', imap_user: 'hi@test.com',
            imap_pass: 'secret', imap_port: 993, resend_api_key: 're_key', email_from: 'hi@test.com',
          }],
          error: null,
        })
      }
      return resolve({ data: null, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => builder(table),
    rpc: vi.fn(async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_email') { contactCreateCalls.push(fn); return { data: 'contact-1', error: null } }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    }),
  },
}))

import { GET } from './route'

function req() {
  return new NextRequest('http://t/api/cron/comhub-email', { headers: { authorization: 'Bearer test-cron-secret' } })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  askSelenaCalls.length = 0
  contactCreateCalls.length = 0
  messageInserts.length = 0
})

describe('comhub-email cron — DNS gate on inbound mail', () => {
  it('a do_not_service client\'s inbound email creates no ComHub contact/thread/message and gets no auto-reply', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(contactCreateCalls).toHaveLength(0)
    expect(messageInserts).toHaveLength(0)
    expect(askSelenaCalls).toHaveLength(0)
  })
})
