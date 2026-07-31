import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * comhub-email cron — Yinez/Selena email auto-reply, nycmaid parity.
 *
 * nycmaid hardcoded email auto-reply OFF (`if (true || paused || ...)`,
 * dated 2026-05-29 — Selena wasn't checking schedule availability before
 * replying to email leads), ported tenant-gated into the FL shared cron.
 * That gap is now closed globally: Yinez is self-book-only on every client
 * channel (she never creates a booking directly, always directs the client
 * to the tenant's own booking form — see CLIENT_TOOLS in selena/tools.ts),
 * and score_cleaners (real per-cleaner smart-schedule availability) is
 * mandatory on every channel. Re-enabled for nycmaid 2026-07-25 — the
 * tenant-gate had silently stopped ALL nycmaid email auto-replies since the
 * 2026-07-22 FL cutover, confirmed via comhub_messages (last auto-reply
 * 2026-07-22; inbound mail kept mirroring fine, so only the reply step was
 * dead).
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
    // mailparser's real simpleParser() always returns a Map-like `headers`
    // (case-insensitive `.get()`) -- route.ts's automated-mail filter reads
    // list-unsubscribe/precedence/auto-submitted off it. A real inbound lead
    // email carries none of those, so an empty Map matches production for
    // this "genuine person emailing in" scenario.
    headers: new Map(),
  })),
}))

vi.mock('@/lib/selena/agent', () => ({
  askSelena: vi.fn(async (channel: string, text: string, threadId: string) => {
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
let commhubMessagesExisting: Row[]
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
    lt: () => chain,
    order: () => chain,
    single: async () => {
      if (table === 'comhub_threads') return { data: threadRow, error: null }
      if (table === 'clients') return { data: { do_not_service: false }, error: null }
      return { data: null, error: null }
    },
    update: () => chain,
    insert: () => chain,
    rpc: undefined,
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      if (table === 'tenants') return resolve({ data: tenantsRows, error: null })
      if (table === 'comhub_messages') {
        if (eqs.external_id) return resolve({ data: commhubMessagesExisting, error: null })
        return resolve({ data: null, error: null })
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
      if (fn === 'comhub_get_or_create_contact_by_email') return { data: 'contact-1', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    }),
  },
}))

import { GET } from './route'

function req() {
  return new NextRequest('http://t/api/cron/comhub-email', {
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'test-cron-secret'
  askSelenaCalls.length = 0
  commhubMessagesExisting = []
  threadRow = { bot_paused_until: null }
})

describe('comhub-email cron — Yinez/Selena auto-reply gating', () => {
  it('DOES auto-reply for the nycmaid tenant (re-enabled 2026-07-25)', async () => {
    tenantsRows = [
      {
        id: NYCMAID_TENANT_ID,
        name: 'The NYC Maid',
        imap_host: 'mail.thenycmaid.com',
        imap_user: 'hi@thenycmaid.com',
        imap_pass: 'secret',
        imap_port: 993,
        resend_api_key: null,
        email_from: null,
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(askSelenaCalls).toHaveLength(1)
  })

  it('DOES auto-reply for a non-nycmaid tenant', async () => {
    tenantsRows = [
      {
        id: OTHER_TENANT_ID,
        name: 'Other Co',
        imap_host: 'mail.other.com',
        imap_user: 'hi@other.com',
        imap_pass: 'secret',
        imap_port: 993,
        resend_api_key: 're_key',
        email_from: 'hi@other.com',
      },
    ]

    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(askSelenaCalls).toHaveLength(1)
  })
})
