import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Regression: authorize() used to accept the monitor secret via a URL query
 * param (?key=...) as a fallback to the x-monitor-key header. URL query
 * params land in access/proxy logs and browser history, unlike a header.
 * Fixed to require the header only (the session-based requirePermission
 * fallback is untouched). These tests prove the query-param path is now
 * rejected while the header path still works.
 */

const MONITOR_KEY = 'monitor-test-key'
const TENANT_ID = 'tenant-abc'

// Generic self-returning chainable stub — every method returns the same
// object, and the object itself resolves like a supabase query result.
function makeChainable(): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  for (const m of ['from', 'select', 'eq', 'order', 'limit', 'ilike']) {
    obj[m] = () => obj
  }
  obj.then = (resolve: (v: { data: unknown[]; error: null }) => unknown) => resolve({ data: [], error: null })
  return obj
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: makeChainable() }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () =>
    ({ tenant: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }),
}))

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

describe('admin/selena/sms-status auth — URL query-param key is rejected', () => {
  it('401s (falls through to session auth, which also fails) when the correct key is passed ONLY as a URL query param', async () => {
    const res = await GET(
      req(`https://x.test/api/admin/selena/sms-status?key=${MONITOR_KEY}&tenant_id=${TENANT_ID}`)
    )
    expect(res.status).toBe(401)
  })
})

describe('admin/selena/sms-status auth — positive control (gate still opens)', () => {
  it('200s with a correct x-monitor-key header + tenant_id', async () => {
    const res = await GET(
      req(`https://x.test/api/admin/selena/sms-status?tenant_id=${TENANT_ID}`, { 'x-monitor-key': MONITOR_KEY })
    )
    expect(res.status).toBe(200)
  })

  it('400s a correct header key without tenant_id (required for monitor-key access)', async () => {
    const res = await GET(req('https://x.test/api/admin/selena/sms-status', { 'x-monitor-key': MONITOR_KEY }))
    expect(res.status).toBe(400)
  })
})
