/**
 * GET /api/cron/comhub-email — do_not_service lookup LIKE-wildcard injection.
 *
 * pollAccount()'s Yinez-auto-reply gate reads the inbound message's From
 * address (attacker-influenceable — SMTP does not authenticate the From
 * header on mail arriving at this polled inbox) and looks it up against
 * `clients.email` via `.ilike('email', fromAddr)` with NO escaping. Same bug
 * class already fixed + enforced (see like-wildcard-routes.test.ts) across
 * client/check, client/book, referrers/*, pin-reset, inbound-email-tenant —
 * this call site was missed.
 *
 * A crafted From address containing a bare `%`/`_` doesn't match literally;
 * it becomes a real SQL wildcard against `clients(tenant_id, email)`, which
 * has only a plain (non-unique) index (migration 006_error_resilience.sql)
 * -- duplicate-email rows are possible, and a wildcarded lookup can resolve
 * to a DIFFERENT client's `do_not_service` flag than the actual sender's.
 * That lets a blocked/opted-out contact craft a From address that misses
 * their own do_not_service row and still gets an automated Yinez reply, or
 * (inverse) suppresses a reply that should have gone to a genuine new
 * correspondent. Fix: escapeLikeValue() before the ilike, same as every
 * other exact-match `.ilike()` call site in the app.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createFakeSupabase } from '@/test/fake-supabase'
import { escapeLikeValue } from '@/lib/postgrest-safe'

const TENANT_ID = 'tenant-ce-wc1'
const MESSAGE_ID = '<wildcard-msg-1@example.com>'
const FROM_ADDR = '%_attacker@example.com'

const h = vi.hoisted(() => ({
  fake: null as ReturnType<typeof import('@/test/fake-supabase').createFakeSupabase> | null,
  capturedClientIlike: [] as { col: string; pattern: string }[],
}))

vi.mock('@/lib/supabase', () => ({
  get supabaseAdmin() {
    return {
      from: (table: string) => {
        const fromBuilder = h.fake!.from(table)
        if (table === 'clients') {
          const origSelect = fromBuilder.select.bind(fromBuilder)
          fromBuilder.select = (cols?: string, opts?: { count?: string; head?: boolean }) => {
            const qb = origSelect(cols, opts)
            const origIlike = qb.ilike.bind(qb)
            qb.ilike = (col: string, pattern: string) => {
              h.capturedClientIlike.push({ col, pattern })
              return origIlike(col, pattern)
            }
            return qb
          }
        }
        return fromBuilder
      },
      rpc: (name: string) => {
        if (name === 'comhub_get_or_create_contact_by_email') return Promise.resolve({ data: 'contact-1', error: null })
        if (name === 'comhub_get_or_create_thread') return Promise.resolve({ data: 'thread-1', error: null })
        return Promise.resolve({ data: null, error: { message: `unknown rpc ${name}` } })
      },
    }
  },
}))

vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (v: string) => v }))

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
    from: { value: [{ address: FROM_ADDR, name: 'Attacker' }] },
    subject: 'Hi',
    text: 'Hello',
    date: new Date('2026-07-18T12:00:00.000Z'),
  }),
}))
vi.mock('@/lib/selena/agent', () => ({ askSelena: vi.fn(async () => ({ text: 'Reply' })) }))
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
  h.capturedClientIlike = []
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
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('comhub-email do_not_service lookup — LIKE-wildcard escaping', () => {
  it('escapes % and _ in the From-address ilike filter against clients.email', async () => {
    const res = await GET(cronReq())
    expect(res.status).toBe(200)

    const clientCall = h.capturedClientIlike.find((c) => c.col === 'email')
    expect(clientCall).toBeDefined()
    expect(clientCall!.pattern).toBe(escapeLikeValue(FROM_ADDR))
    // No bare, unescaped % or _ may reach the ilike filter.
    expect(clientCall!.pattern).not.toMatch(/(?<!\\)[%_]/)
  })
})
