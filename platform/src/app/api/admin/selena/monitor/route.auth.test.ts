/**
 * ELCHAPO_MONITOR_KEY query-param leak — /api/admin/selena/monitor.
 *
 * The monitor key used to be accepted via `?key=` as well as the
 * `x-monitor-key` header. A query param gets written to access logs, browser
 * history, and Referer headers on any outbound link — leaking the key.
 * Proves the key is now header-only.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.hoisted(() => {
  process.env.ELCHAPO_MONITOR_KEY = 'test-monitor-key'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('GET /api/admin/selena/monitor — monitor key auth', () => {
  it('rejects the key when sent only as a ?key= query param', async () => {
    const req = new NextRequest('http://x/api/admin/selena/monitor?key=test-monitor-key')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it('accepts the key when sent via the x-monitor-key header', async () => {
    const req = new NextRequest('http://x/api/admin/selena/monitor', {
      headers: { 'x-monitor-key': 'test-monitor-key' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
