import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * Regression: authorized() used to accept the monitor secret via a URL query
 * param (?key=...) as a fallback to the x-monitor-key header. URL query
 * params land in access/proxy logs and browser history, unlike a header.
 * Fixed to require the header only. These tests prove the query-param path
 * is now rejected while the header path still works.
 */

const MONITOR_KEY = 'monitor-test-key'

// Generic self-returning chainable stub — every method returns the same
// object, and the object itself resolves like a supabase query result. Covers
// this route's several distinct chains (conversations, per-outcome counts,
// errors) without hand-modeling each one.
function makeChainable(): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const m of ['from', 'select', 'eq', 'not', 'order', 'limit', 'in', 'gte', 'maybeSingle']) {
    obj[m] = () => obj
  }
  obj.then = (resolve: (v: { data: unknown[]; error: null; count: number }) => unknown) =>
    resolve({ data: [], error: null, count: 0 })
  return obj
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeChainable() }))

import { GET } from './route'

let saved: string | undefined

beforeEach(() => {
  saved = process.env.ELCHAPO_MONITOR_KEY
  process.env.ELCHAPO_MONITOR_KEY = MONITOR_KEY
})

afterEach(() => {
  if (saved === undefined) delete process.env.ELCHAPO_MONITOR_KEY
  else process.env.ELCHAPO_MONITOR_KEY = saved
})

function req(url: string, headers?: Record<string, string>) {
  return new NextRequest(url, { headers })
}

describe('admin/selena/monitor auth — URL query-param key is rejected', () => {
  it('401s a request carrying the correct key ONLY as a URL query param', async () => {
    const res = await GET(req(`https://x.test/api/admin/selena/monitor?key=${MONITOR_KEY}`))
    expect(res.status).toBe(401)
  })
})

describe('admin/selena/monitor auth — positive control (gate still opens)', () => {
  it('200s with a correct x-monitor-key header', async () => {
    const res = await GET(req('https://x.test/api/admin/selena/monitor', { 'x-monitor-key': MONITOR_KEY }))
    expect(res.status).toBe(200)
  })
})

describe('admin/selena/monitor auth — fails closed', () => {
  it('401s with no credentials at all', async () => {
    const res = await GET(req('https://x.test/api/admin/selena/monitor'))
    expect(res.status).toBe(401)
  })

  it('401s when ELCHAPO_MONITOR_KEY is unset, even with a plausible header', async () => {
    delete process.env.ELCHAPO_MONITOR_KEY
    const res = await GET(req('https://x.test/api/admin/selena/monitor', { 'x-monitor-key': MONITOR_KEY }))
    expect(res.status).toBe(401)
  })
})
