/**
 * GET /api/cron/comhub-email — concurrent-invocation duplicate-reply race.
 *
 * pollAccount()'s idempotency check on comhub_messages(tenant_id,
 * external_id, channel) (dedup by IMAP Message-ID) was a plain
 * select-then-insert with no DB constraint behind it. This cron fires every
 * 2 minutes (vercel.json) with maxDuration=60s and no run-lock -- IMAP
 * connect + per-message Yinez AI-reply latency can easily make one
 * invocation still be mid-poll when the next one starts. Two concurrent
 * invocations can both "see" the same new message before either's insert
 * lands, both pass the select-based dup check, and both send a Yinez
 * auto-reply to the same customer for the same email -- the email-channel
 * equivalent of the '4/29 SMS-blast lesson' cron/rating-prompt already
 * guards against.
 *
 * Fix: a partial unique index on comhub_messages(tenant_id, external_id,
 * channel) WHERE external_id IS NOT NULL (migration
 * 2026_07_17_unique_comhub_messages_external_id.sql) plus a 23505 catch on
 * the inbound insert that treats the loser as an idempotent no-op (skip the
 * Yinez auto-reply the winning invocation already sent).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeSupabase } from '@/test/fake-supabase'

const TENANT_ID = 'tenant-ce1'
const MESSAGE_ID = '<fixed-msg-1@example.com>'

const h = vi.hoisted(() => ({ fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null, replyCount: 0 }))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return {
      from: (table: string) => h.fake!.from(table),
      rpc: (name: string) => {
        if (name === 'comhub_get_or_create_contact_by_email') return Promise.resolve({ data: 'contact-1', error: null })
        if (name === 'comhub_get_or_create_thread') return Promise.resolve({ data: 'thread-1', error: null })
        return Promise.resolve({ data: null, error: { message: `unknown rpc ${name}` } })
      },
    }
  },
}))

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

// Both concurrent pollAccount() calls "see" the exact same unread IMAP
// message -- the real-world precondition for this race (neither call's
// per-message cursor has advanced past it before the other connects).
vi.mock('imapflow', () => ({
  ImapFlow: class {
    async connect() {}
    async getMailboxLock() { return { release: () => {} } }
    async search() { return [1] }
    async fetchOne() { return { source: Buffer.from('raw') } }
    async logout() {}
  },
}))
vi.mock('mailparser', () => ({
  simpleParser: async () => ({
    messageId: MESSAGE_ID,
    from: { value: [{ address: 'customer@example.com', name: 'Customer' }] },
    subject: 'Question about booking',
    text: 'Can I reschedule?',
    date: new Date('2026-07-17T12:00:00.000Z'),
  }),
}))
vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async () => {
    h.replyCount += 1
    return { text: 'Sure, happy to help!' }
  }),
}))
vi.mock('@/lib/messaging/shell', () => ({ emailShell: () => '<p>reply</p>' }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ id: 'resend-outbound-id' })) }))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: vi.fn(async () => ({ success: true, data: { id: 'x' } })) }))

import { GET } from './route'

function cronReq() {
  return new NextRequest('https://x.test/api/cron/comhub-email', {
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.replyCount = 0
  h.fake = createFakeSupabase({
    tenants: [{
      id: TENANT_ID,
      name: 'Test Tenant',
      imap_host: 'imap.test',
      imap_user: 'hi@test.example',
      imap_pass: 'enc:secret',
      imap_port: 993,
      resend_api_key: 're_live_test',
      email_from: 'Test Tenant <hi@test.example>',
    }],
    comhub_threads: [{ id: 'thread-1', tenant_id: TENANT_ID, unread_count: 0 }],
    clients: [],
  })
  h.fake._addUniqueConstraint('comhub_messages', 'external_id')
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('concurrent comhub-email invocations racing the same unread IMAP message', () => {
  it('mirrors the inbound message exactly once and sends exactly one Yinez auto-reply', async () => {
    const [first, second] = await Promise.all([GET(cronReq()), GET(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)

    const inbound = h.fake!._all('comhub_messages').filter((r) => r.direction === 'in')
    expect(inbound).toHaveLength(1)
    expect(h.replyCount).toBe(1)

    const outbound = h.fake!._all('comhub_messages').filter((r) => r.direction === 'auto')
    expect(outbound).toHaveLength(1)
  })
})
