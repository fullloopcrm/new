import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * PATCH /api/bookings/[id]/status — item (117): the cancellation and
 * completion notify() messages rendered `booking.start_time` with a bare
 * `toLocaleDateString` and no `timeZone` option (and this route never
 * fetched the tenant row at all, so no timezone was even available) — same
 * shape as item (115)'s sms-templates.ts fix, one layer up on the notify()
 * side. Proves the fix: both messages now render the tenant's own
 * configured zone, not the server runtime default.
 */

const { notifyMock } = vi.hoisted(() => ({
  notifyMock: vi.fn(async (..._args: unknown[]) => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify: notifyMock }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId, role: 'owner' }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const TENANT_ID = 'tenant-tz-status'
const TECH_ID = 'tech-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function req(status: string): Request {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify({ status }) })
}

beforeEach(() => {
  fake._store.clear()
  notifyMock.mockClear()
  currentTenantId = TENANT_ID
  fake._seed('tenants', [{ id: TENANT_ID, timezone: 'America/Los_Angeles' }])
})

describe('bookings/[id]/status PATCH — notify() dates render in the tenant\'s own timezone', () => {
  // 2026-08-10T05:00:00Z = Aug 10, 1:00 AM in America/New_York (the test
  // runner's own default zone) but still Aug 9, 10:00 PM in the tenant's
  // configured America/Los_Angeles — a timestamp that only a real
  // Pacific-zone render (not the server-default fallback) gets right.
  it('cancellation message shows the Pacific calendar date, not the server-default one', async () => {
    fake._seed('bookings', [
      { id: 'bk-1', tenant_id: TENANT_ID, status: 'scheduled', team_member_id: TECH_ID, start_time: '2026-08-10T05:00:00.000Z' },
    ])
    const res = await PATCH(req('cancelled'), paramsFor('bk-1'))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.message).toContain('Aug 9')
    expect(call.message).not.toContain('Aug 10')
  })

  it('completed message shows the Pacific calendar date, not the server-default one', async () => {
    fake._seed('bookings', [
      { id: 'bk-2', tenant_id: TENANT_ID, status: 'in_progress', team_member_id: TECH_ID, start_time: '2026-08-10T05:00:00.000Z' },
    ])
    const res = await PATCH(req('completed'), paramsFor('bk-2'))
    expect(res.status).toBe(200)
    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0]?.[0] as Record<string, unknown>
    expect(call.message).toContain('Aug 9')
    expect(call.message).not.toContain('Aug 10')
  })
})
