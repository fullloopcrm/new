/**
 * ELCHAPO_MONITOR_KEY query-param leak — /api/admin/selena/sms-status.
 *
 * The monitor key used to be accepted via `?key=` as well as the
 * `x-monitor-key` header. A query param gets written to access logs, browser
 * history, and Referer headers on any outbound link — leaking the key.
 * Proves the key is now header-only (falling through to the permission gate
 * otherwise, which this suite denies to isolate the monitor-key path).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.hoisted(() => {
  process.env.ELCHAPO_MONITOR_KEY = 'test-monitor-key'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ error: NextResponse.json({ error: 'Unauthorized' }, { status: 403 }) }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
})

describe('GET /api/admin/selena/sms-status — monitor key auth', () => {
  it('rejects the key when sent only as a ?key= query param — falls through to permission gate and is denied', async () => {
    const req = new NextRequest('http://x/api/admin/selena/sms-status?key=test-monitor-key&tenant_id=tenant-A')
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('accepts the key when sent via the x-monitor-key header', async () => {
    const req = new NextRequest('http://x/api/admin/selena/sms-status?tenant_id=tenant-A', {
      headers: { 'x-monitor-key': 'test-monitor-key' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})
