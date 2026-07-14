import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: authorize() used to accept the monitor secret via a URL query
 * param (?key=...), which lands in access/proxy logs and browser history —
 * unlike a header, which does not. Fixed to require the secret via the
 * x-monitor-key header (or Authorization: Bearer CRON_SECRET, or JSON body),
 * never the URL. These tests prove the query-param path is now rejected while
 * the header/Bearer/body paths still work (not a blanket lockout).
 */

const CRON_SECRET = 'cron-test-secret'
const MONITOR_KEY = 'monitor-test-key'

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

import { POST, GET } from './route'

let savedCron: string | undefined
let savedMonitor: string | undefined

beforeEach(() => {
  savedCron = process.env.CRON_SECRET
  savedMonitor = process.env.ELCHAPO_MONITOR_KEY
  process.env.CRON_SECRET = CRON_SECRET
  process.env.ELCHAPO_MONITOR_KEY = MONITOR_KEY
})

afterEach(() => {
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
  if (savedMonitor === undefined) delete process.env.ELCHAPO_MONITOR_KEY
  else process.env.ELCHAPO_MONITOR_KEY = savedMonitor
})

function req(opts: { url?: string; headers?: Record<string, string>; body?: unknown } = {}) {
  const url = opts.url || 'https://x.test/api/email/monitor'
  return new NextRequest(url, {
    method: 'POST',
    headers: opts.headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

describe('email/monitor auth — URL query-param key is rejected', () => {
  it('401s a POST carrying the correct key ONLY as a URL query param', async () => {
    const res = await POST(req({ url: `https://x.test/api/email/monitor?key=${MONITOR_KEY}` }))
    expect(res.status).toBe(401)
  })

  it('401s a GET carrying the correct key ONLY as a URL query param', async () => {
    const res = await GET(req({ url: `https://x.test/api/email/monitor?key=${MONITOR_KEY}` }))
    expect(res.status).toBe(401)
  })
})

describe('email/monitor auth — positive controls (gate still opens)', () => {
  it('200s with a correct x-monitor-key header', async () => {
    const res = await POST(req({ headers: { 'x-monitor-key': MONITOR_KEY } }))
    expect(res.status).toBe(200)
  })

  it('200s with a correct Authorization: Bearer CRON_SECRET header', async () => {
    const res = await POST(req({ headers: { authorization: `Bearer ${CRON_SECRET}` } }))
    expect(res.status).toBe(200)
  })

  it('200s with the correct key in the JSON body', async () => {
    const res = await POST(req({ headers: { 'content-type': 'application/json' }, body: { key: MONITOR_KEY } }))
    expect(res.status).toBe(200)
  })
})

describe('email/monitor auth — fails closed', () => {
  it('401s with no credentials at all', async () => {
    const res = await POST(req())
    expect(res.status).toBe(401)
  })

  it('401s with a wrong header key', async () => {
    const res = await POST(req({ headers: { 'x-monitor-key': 'wrong' } }))
    expect(res.status).toBe(401)
  })
})
