/**
 * CLIENT RECURRING BOOKING — team_member ownership gate.
 *
 * Mirrors the client/reschedule fix (docs/adr/0004 sibling): cleaner_id /
 * extra_cleaner_ids came straight from client input with no ownership check,
 * letting a client point their recurring schedule + every generated
 * booking's team_member_id FK at any team_members row — including another
 * tenant's, or an inactive one in their own tenant. Proves the new gate
 * rejects both and lets an active, same-tenant assignment through.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_ID = 'tenant-A'
const OTHER_TENANT_ID = 'tenant-B'
const CLIENT_ID = 'client-a'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: async () => ({ clientId: CLIENT_ID }),
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

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [{ id: CLIENT_ID, tenant_id: TENANT_ID }])
  // Repeat-client gate requires >=1 completed booking.
  fake._seed('bookings', [{ id: 'bk-prior', tenant_id: TENANT_ID, client_id: CLIENT_ID, status: 'completed' }])
  fake._seed('team_members', [
    { id: 'tm-a-active', tenant_id: TENANT_ID, active: true },
    { id: 'tm-a-inactive', tenant_id: TENANT_ID, active: false },
    { id: 'tm-b', tenant_id: OTHER_TENANT_ID, active: true },
  ])
})

function body(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_id: CLIENT_ID,
    frequency: 'weekly',
    start_date: '2026-08-03',
    time: '10:00',
    hours: 2,
    ...overrides,
  }
}

function req(overrides: Record<string, unknown> = {}): Request {
  return new Request('http://x/api/client/recurring', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body(overrides)),
  })
}

describe('POST /api/client/recurring — team_member ownership gate', () => {
  it("rejects an assignment to another tenant's team member — 400, no schedule/new bookings created", async () => {
    const res = await POST(req({ cleaner_id: 'tm-b' }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
    expect(fake._all('bookings')).toHaveLength(1) // only the seeded prior booking
  })

  it('rejects an assignment to an inactive team member in the same tenant — 400', async () => {
    const res = await POST(req({ cleaner_id: 'tm-a-inactive' }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
  })

  it('rejects a foreign extra_cleaner_ids entry even when cleaner_id is valid — 400', async () => {
    const res = await POST(req({ cleaner_id: 'tm-a-active', extra_cleaner_ids: ['tm-b'] }))
    expect(res.status).toBe(400)
    expect(fake._all('recurring_schedules')).toHaveLength(0)
  })

  it('allows an active, same-tenant assignment (positive control)', async () => {
    const res = await POST(req({ cleaner_id: 'tm-a-active' }))
    expect(res.status).toBe(200)
    const resBody = await res.json()
    expect(resBody.bookings_created).toBeGreaterThan(0)
    const schedule = fake._all('recurring_schedules')[0]
    expect(schedule.team_member_id).toBe('tm-a-active')
  })
})
