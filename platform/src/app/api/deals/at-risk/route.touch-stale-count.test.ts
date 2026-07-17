/**
 * POST /api/deals/at-risk (action: 'touch') used to compute
 * `outreach_count: (current_count || 0) + 1` from a client-supplied
 * `current_count` in the request body, instead of reading the current value
 * server-side. That's not just a race window -- the caller's value can be
 * stale by an entire user-think-time gap (rep loads the "workable" list,
 * reads it, decides to call, then clicks "touch" later), during which
 * another rep (or the same rep in another tab) could have already touched
 * the same client. Trusting the stale value silently drops that touch
 * instead of building on top of it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT_ID }, error: null })),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function req(body: Row): Request {
  return new Request('http://x/api/deals/at-risk', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  // Server-side truth is already 6 (another touch landed after the caller's
  // page loaded); the caller's UI still thinks it's 5.
  fake._seed('clients', [
    { id: 'client-1', tenant_id: TENANT_ID, outreach_count: 6, outreach_status: 'active' } as Row,
  ])
})

describe("POST /api/deals/at-risk (touch) — stale client-supplied current_count", () => {
  it('increments from the real server-side count, not the stale client value', async () => {
    const res = await POST(req({ client_id: 'client-1', action: 'touch', current_count: 5 }))
    expect((await res.json()).success).toBe(true)

    const rows = fake._all('clients')
    expect(rows[0].outreach_count).toBe(7)
  })
})
