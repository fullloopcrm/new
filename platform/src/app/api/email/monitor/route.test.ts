import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * email/monitor's authorize() compared CRON_SECRET/ELCHAPO_MONITOR_KEY with a
 * naive `===`, unlike the timingSafeEqual convention used elsewhere in the
 * codebase (e.g. internal/deploy-hook) — a timing side-channel on a public,
 * unauthenticated POST/GET route that triggers real payment matching +
 * reconciliation. Fixed with a length-checked crypto.timingSafeEqual compare.
 */

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          not: () => ({
            not: () => ({
              not: () => ({
                limit: () => Promise.resolve({ data: [], error: null }),
              }),
            }),
          }),
        }),
      }),
    }),
  },
}))

vi.mock('@/lib/email-monitor', () => ({
  fetchUnreadEmails: vi.fn(),
  markEmailRead: vi.fn(),
}))

vi.mock('@/lib/payment-email-parser', () => ({
  detectPaymentEmail: vi.fn(),
  parsePaymentEmail: vi.fn(),
}))

vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(),
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

function reqWithBearer(token: string) {
  return new NextRequest('http://t/api/email/monitor', {
    method: 'POST',
    headers: { authorization: `Bearer ${token}` },
  })
}

function reqWithQueryKey(key: string) {
  return new NextRequest(`http://t/api/email/monitor?key=${encodeURIComponent(key)}`, { method: 'POST' })
}

function reqWithBodyKey(key: string) {
  return new NextRequest('http://t/api/email/monitor', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ key }),
  })
}

describe('email/monitor authorize()', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'real-cron-secret'
    process.env.ELCHAPO_MONITOR_KEY = 'real-monitor-key'
  })

  it('rejects a missing key', async () => {
    const res = await POST(new NextRequest('http://t/api/email/monitor', { method: 'POST' }))
    expect(res.status).toBe(401)
  })

  it('rejects a wrong-but-same-length CRON_SECRET (guards against a regression to plain ===)', async () => {
    const wrong = 'x'.repeat(process.env.CRON_SECRET!.length)
    const res = await POST(reqWithBearer(wrong))
    expect(res.status).toBe(401)
  })

  it('rejects a wrong-length key without throwing (Buffer length mismatch must be handled)', async () => {
    const res = await POST(reqWithQueryKey('short'))
    expect(res.status).toBe(401)
  })

  it('accepts the correct CRON_SECRET bearer token', async () => {
    const res = await POST(reqWithBearer(process.env.CRON_SECRET!))
    expect(res.status).toBe(200)
  })

  it('accepts the correct ELCHAPO_MONITOR_KEY as a query param', async () => {
    const res = await POST(reqWithQueryKey(process.env.ELCHAPO_MONITOR_KEY!))
    expect(res.status).toBe(200)
  })

  it('accepts the correct ELCHAPO_MONITOR_KEY in the JSON body', async () => {
    const res = await POST(reqWithBodyKey(process.env.ELCHAPO_MONITOR_KEY!))
    expect(res.status).toBe(200)
  })
})
