import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * comhub-email cron — Yinez/Selena email auto-reply, nycmaid parity.
 *
 * nycmaid hardcoded email auto-reply OFF (`if (true || paused || ...)`,
 * dated 2026-05-29 — Selena wasn't checking schedule availability before
 * replying to email leads). The FL tenant-scoped port dropped that
 * override, so Selena would auto-email nycmaid leads with the exact bug
 * Jeff turned off. Fixed by gating the off-switch to the nycmaid tenant
 * only — other tenants keep auto-reply.
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
  // CRON_SECRET is captured as a module-level constant on import, before
  // beforeEach can set it — use the Vercel-cron header path instead.
  return new NextRequest('http://t/api/cron/comhub-email', {
    headers: { 'x-vercel-cron': '1' },
  })
}

beforeEach(() => {
  askSelenaCalls.length = 0
  commhubMessagesExisting = []
  threadRow = { bot_paused_until: null }
})

describe('comhub-email cron — Yinez/Selena auto-reply gating', () => {
  it('does NOT auto-reply for the nycmaid tenant (parity with source hardcoded-off)', async () => {
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
    expect(askSelenaCalls).toHaveLength(0)
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
