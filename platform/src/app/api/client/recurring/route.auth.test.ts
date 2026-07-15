/**
 * CLIENT RECURRING-BOOKING AUTH GATE — /api/client/recurring POST.
 *
 * Fleet-wide webhook/cron audit finding, 2026-07-13: unlike every sibling
 * client/* route, this route never called protectClientAPI(). Anyone who
 * had (or guessed) another client's client_id could create real recurring
 * bookings on that client's account and trigger confirmation email/SMS to
 * them — no session cookie, no ownership check.
 *
 * This suite proves protectClientAPI() is now wired in and its verdict is
 * honored: a denied session is rejected before any booking is created.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextResponse } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

let authResult: { clientId: string } | NextResponse
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => authResult,
}))

vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientEmail: vi.fn(async () => ({ ok: true })),
  sendClientSMS: vi.fn(async () => ({ ok: true })),
}))
vi.mock('@/lib/messaging/client-email', () => ({
  confirmationEmailFor: async () => ({ subject: 'x', html: 'x' }),
}))
vi.mock('@/lib/messaging/client-sms', () => ({
  clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => 'x' }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-A'
const VICTIM_CLIENT_ID = 'client-victim'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ id: VICTIM_CLIENT_ID, tenant_id: TENANT_ID }])
})

function body(): Record<string, unknown> {
  return {
    client_id: VICTIM_CLIENT_ID,
    frequency: 'weekly',
    start_date: '2026-08-03',
    time: '10:00',
    hours: 2,
  }
}

function req(): Request {
  return new Request('http://x/api/client/recurring', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body()),
  })
}

describe('POST /api/client/recurring — auth gate', () => {
  it('rejects a forged recurring booking and creates no rows', async () => {
    authResult = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const res = await POST(req())
    expect(res.status).toBe(403)

    const { data } = await fake.from('recurring_schedules').select('id') // tenant-scope-ok: fake in-memory store assertion, not a live tenant-scoped query
    expect((data as unknown[] | null) || []).toHaveLength(0)
    const { data: bookings } = await fake.from('bookings').select('id') // tenant-scope-ok: fake in-memory store assertion, not a live tenant-scoped query
    expect((bookings as unknown[] | null) || []).toHaveLength(0)
  })
})
