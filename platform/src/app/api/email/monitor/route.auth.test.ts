/**
 * ELCHAPO_MONITOR_KEY query-param leak — /api/email/monitor.
 *
 * The monitor key used to be accepted via `?key=` in addition to the POST
 * body `{key}` and the cron Bearer header. A query param gets written to
 * access logs, browser history, and Referer headers on any outbound link —
 * leaking the key. Proves the key is now body-only (plus the cron Bearer).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.hoisted(() => {
  process.env.ELCHAPO_MONITOR_KEY = 'test-monitor-key'
  process.env.CRON_SECRET = 'test-cron-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

function postReq(init: { url?: string; body?: unknown; headers?: Record<string, string> } = {}): NextRequest {
  return new NextRequest(init.url || 'http://x/api/email/monitor', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(init.headers || {}) },
    body: JSON.stringify(init.body ?? {}),
  })
}

describe('POST /api/email/monitor — monitor key auth', () => {
  it('rejects the key when sent only as a ?key= query param', async () => {
    const res = await POST(postReq({ url: 'http://x/api/email/monitor?key=test-monitor-key' }))
    expect(res.status).toBe(401)
  })

  it('accepts the key when sent in the POST body', async () => {
    const res = await POST(postReq({ body: { key: 'test-monitor-key' } }))
    expect(res.status).toBe(200)
  })

  it('accepts the cron Bearer header', async () => {
    const res = await POST(postReq({ headers: { authorization: 'Bearer test-cron-secret' } }))
    expect(res.status).toBe(200)
  })
})
