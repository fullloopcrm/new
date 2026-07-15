import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: authorize() used to accept the monitor secret via a URL query
 * param (?key=...) as a fallback to the Bearer/body auth. URL query params
 * land in access/proxy logs and browser history, unlike a header or POST
 * body. Fixed to require Bearer CRON_SECRET or an in-body key only. These
 * tests prove the query-param path is now rejected while the body-key path
 * still works.
 */

const MONITOR_KEY = 'monitor-test-key'

// Generic self-returning chainable stub resolving to zero tenants, so an
// authorized request short-circuits at the "No tenants with email monitor
// enabled" fast path without touching IMAP internals.
function makeChainable(): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const m of ['from', 'select', 'eq', 'not', 'limit']) {
    obj[m] = () => obj
  }
  obj.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
  return obj
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeChainable() }))

import { POST } from './route'

let savedKey: string | undefined
let savedCron: string | undefined

beforeEach(() => {
  savedKey = process.env.ELCHAPO_MONITOR_KEY
  savedCron = process.env.CRON_SECRET
  process.env.ELCHAPO_MONITOR_KEY = MONITOR_KEY
  delete process.env.CRON_SECRET
})

afterEach(() => {
  if (savedKey === undefined) delete process.env.ELCHAPO_MONITOR_KEY
  else process.env.ELCHAPO_MONITOR_KEY = savedKey
  if (savedCron === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = savedCron
})

function postReq(url: string, opts?: { headers?: Record<string, string>; body?: unknown }) {
  return new NextRequest(url, {
    method: 'POST',
    headers: opts?.headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
}

describe('email/monitor auth — URL query-param key is rejected', () => {
  it('401s a request carrying the correct key ONLY as a URL query param', async () => {
    const res = await POST(postReq(`https://x.test/api/email/monitor?key=${MONITOR_KEY}`))
    expect(res.status).toBe(401)
  })
})

describe('email/monitor auth — positive control (gate still opens)', () => {
  it('200s with the correct key in the JSON body', async () => {
    const res = await POST(postReq('https://x.test/api/email/monitor', { body: { key: MONITOR_KEY } }))
    expect(res.status).toBe(200)
  })
})

describe('email/monitor auth — fails closed', () => {
  it('401s with no credentials at all', async () => {
    const res = await POST(postReq('https://x.test/api/email/monitor'))
    expect(res.status).toBe(401)
  })
})
