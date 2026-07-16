/**
 * POST /api/email/monitor — concurrent-invocation duplicate-payment race.
 *
 * processTenant()'s idempotency check on payments.raw_email_id (dedup by
 * IMAP message id) was a plain select-then-insert with no DB constraint
 * behind it. Two concurrent invocations of this cron endpoint for the same
 * tenant (overlapping cron fires, or a manual re-trigger racing the
 * scheduled one -- there is no run-lock and maxDuration is 60s) can both
 * fetchUnreadEmails() the SAME unread message before either call's
 * markEmailRead() lands, both pass the select-based dup check, and both
 * insert a payments row -- double-marking the booking paid and
 * double-notifying the client.
 *
 * Fix: a partial unique index on payments(tenant_id, raw_email_id) WHERE
 * raw_email_id IS NOT NULL (migration 2026_07_16_unique_payments_raw_email_id.sql)
 * plus a 23505 catch on the insert that treats the loser as an idempotent
 * no-op (skip the booking update/SMS/notification the winner already did).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeLedgerSupabaseFake } from '@/test/ledger-supabase-fake'

const TENANT_ID = 'tenant-em1'
const MESSAGE_ID = 'imap-msg-fixed-1'

const h = vi.hoisted(() => ({ seq: 0, store: {} as Record<string, Array<Record<string, unknown>>> }))

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeLedgerSupabaseFake(h) }))

// Both concurrent processTenant() calls "see" the exact same unread IMAP
// message -- the real-world precondition for this race (neither call's
// markEmailRead() has landed with the mail server before the other fetches).
vi.mock('@/lib/email-monitor', () => ({
  fetchUnreadEmails: vi.fn(async () => [{
    uid: 1, from: 'zelle@chase.com', fromName: 'Chase', subject: 'You received money with Zelle',
    text: 'You received $50.00 from Jane Doe', date: new Date('2026-07-16T12:00:00.000Z'), messageId: MESSAGE_ID,
  }]),
  markEmailRead: vi.fn(async () => {}),
}))

vi.mock('@/lib/payment-email-parser', () => ({
  detectPaymentEmail: vi.fn(() => 'zelle'),
  parsePaymentEmail: vi.fn(() => ({
    method: 'zelle', amount: 50, amountCents: 5000, senderName: 'Jane Doe',
    senderEmail: 'jane@example.com', date: new Date('2026-07-16T12:00:00.000Z'), referenceId: MESSAGE_ID,
  })),
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => {}) }))

import { POST } from './route'

function cronReq() {
  return new NextRequest('https://x.test/api/email/monitor', {
    method: 'POST',
    headers: { authorization: 'Bearer cron-secret-test' },
  })
}

let savedCron: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  process.env.CRON_SECRET = 'cron-secret-test'
  h.seq = 0
  h.store = {
    tenants: [{
      id: TENANT_ID, name: 't', imap_host: 'imap.test', imap_port: 993, imap_user: 'u', imap_pass: 'p',
      email_monitor_enabled: true, telnyx_api_key: null, telnyx_phone: null,
    }],
    bookings: [{ id: 'bk1', tenant_id: TENANT_ID, client_id: 'client-1', payment_status: 'pending', price: 5000, start_time: '2026-07-01T00:00:00.000Z' }],
    payments: [],
    notifications: [],
    unmatched_payments: [],
    admin_tasks: [],
  }
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

describe('concurrent email/monitor invocations racing the same unread payment email', () => {
  it('lands exactly one payments row and marks the booking paid exactly once', async () => {
    const [first, second] = await Promise.all([POST(cronReq()), POST(cronReq())])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    expect(h.store.payments).toHaveLength(1)
    expect(h.store.notifications).toHaveLength(1)
    expect(h.store.bookings[0].payment_status).toBe('paid')
  })
})
