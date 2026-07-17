import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * POST /api/email/monitor — matchPaymentToBooking()'s step-3 fallback
 * matches a detected email "payment" to ANY unpaid booking in the tenant
 * purely by dollar amount, with zero identity signal (no sender-name /
 * client-name match required).
 *
 * detectPaymentEmail()/parsePaymentEmail() (lib/payment-email-parser.ts)
 * trust the raw IMAP message's From/subject/body verbatim — there is no
 * DKIM/SPF/Authentication-Results check anywhere in this pass. The Zelle
 * sender allowlist is a bare substring match (`fromLower.includes(s)`,
 * e.g. `'zelle'`), so anyone who owns a mailbox on a domain containing
 * that substring (no spoofing required — it's their own domain) can email
 * a tenant's monitored inbox claiming "you received a $500 Zelle payment"
 * and, with no knowledge of any real client, get a real unrelated client's
 * booking auto-marked `payment_status: 'paid'` — free service / lost
 * revenue for the tenant, zero real money moved.
 *
 * This suite proves the fallback match happens today (RED against the
 * pre-fix code) and must stop happening (GREEN after removing the
 * identity-free fallback).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>

function likeToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      out += '.*'
    } else if (c === '_') {
      out += '.'
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`, 'i')
}

let store: Record<string, Row[]>

function resetStore() {
  store = {
    tenants: [{
      id: TENANT, name: 'Canary Cleaning', imap_host: 'imap.test.com', imap_port: 993,
      imap_user: 'inbox@canary.test', imap_pass: 'secret', email_monitor_enabled: true,
      telnyx_api_key: null, telnyx_phone: null,
    }],
    payments: [],
    clients: [{ id: 'client-real', tenant_id: TENANT, name: 'Sarah Connor', phone: '+15551234567' }],
    bookings: [{
      id: 'booking-real', tenant_id: TENANT, client_id: 'client-real', price: 50000,
      payment_status: 'pending', payment_sender_name: null, start_time: '2026-07-01T00:00:00Z',
      clients: { phone: '+15551234567' },
    }],
    unmatched_payments: [],
    admin_tasks: [],
    notifications: [],
  }
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    let rows: Row[] = [...(store[table] || [])]
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] === val); return c },
      neq: (col: string, val: unknown) => { rows = rows.filter((r) => r[col] !== val); return c },
      not: (col: string, _op: string, val: unknown) => { rows = rows.filter((r) => r[col] !== val); return c },
      gte: (col: string, val: number) => { rows = rows.filter((r) => Number(r[col] ?? 0) >= val); return c },
      lte: (col: string, val: number) => { rows = rows.filter((r) => Number(r[col] ?? 0) <= val); return c },
      ilike: (col: string, pattern: string) => {
        const re = likeToRegExp(pattern)
        rows = rows.filter((r) => re.test(String(r[col] ?? '')))
        return c
      },
      order: () => c,
      limit: (n: number) => { rows = rows.slice(0, n); return c },
      insert: (payload: Row | Row[]) => {
        const arr = Array.isArray(payload) ? payload : [payload]
        store[table] = [...(store[table] || []), ...arr.map((p) => ({ id: `new-${table}-${Math.random()}`, ...p }))]
        return Promise.resolve({ data: null, error: null })
      },
      update: (payload: Row) => ({
        eq: (col1: string, val1: unknown) => ({
          eq: (col2: string, val2: unknown) => {
            store[table] = (store[table] || []).map((r) =>
              r[col1] === val1 && r[col2] === val2 ? { ...r, ...payload } : r
            )
            return Promise.resolve({ data: null, error: null })
          },
        }),
      }),
      single: async () => (rows.length > 0 ? { data: rows[0], error: null } : { data: null, error: { message: 'not found' } }),
      then: (resolve: (v: { data: Row[]; error: null }) => void) => resolve({ data: rows, error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/email-monitor', () => ({
  fetchUnreadEmails: async () => [{
    uid: 1,
    from: 'payout@evilzelle.com',
    fromName: 'Totally Unrelated Sender',
    subject: 'You received a Zelle payment',
    text: 'You received a Zelle payment of $500.00 from Totally Unrelated Sender. Thanks for using Zelle!',
    html: '',
    date: new Date('2026-07-17T12:00:00Z'),
    messageId: 'spoofed-msg-1',
  }],
  markEmailRead: async () => {},
}))

import { POST } from '@/app/api/email/monitor/route'
import { NextRequest } from 'next/server'

function req(): NextRequest {
  return new NextRequest('https://canary.example.com/api/email/monitor', {
    method: 'POST',
    headers: { authorization: 'Bearer test-cron-secret' },
  })
}

describe('POST /api/email/monitor — identity-free amount fallback', () => {
  beforeEach(() => {
    resetStore()
    vi.stubEnv('CRON_SECRET', 'test-cron-secret')
  })
  afterEach(() => { vi.unstubAllEnvs() })

  it('does NOT mark an unrelated client\'s booking paid from a sender with no name/identity match', async () => {
    const res = await POST(req())
    expect(res.status).toBe(200)

    const booking = store.bookings.find((b) => b.id === 'booking-real')!
    expect(booking.payment_status).not.toBe('paid')

    // Should route to human reconciliation instead of auto-applying.
    expect(store.unmatched_payments.length).toBe(1)
    expect(store.payments.length).toBe(0)
  })
})
