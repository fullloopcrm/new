/**
 * IDOR — /api/client/recurring had NO auth check at all. `/api/client(.*)` is
 * exempted from the platform's Clerk/session middleware (each handler must
 * verify the caller independently, e.g. /api/client/properties' authClient()
 * gate), but this route took `client_id` straight from the request body and
 * spun up a real 6-week recurring booking series (discounted pricing) for
 * whichever client_id was supplied — no client_session cookie needed. Anyone
 * who knew another client's id could book real, priced, recurring work onto
 * their account and reassign their preferred cleaner.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

let cookieJar = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/nycmaid/auth'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const OWNER_ID = 'client-owner'
const VICTIM_ID = 'client-victim'

function seed() {
  fake._store.clear()
  fake._seed('clients', [
    { id: OWNER_ID, tenant_id: TENANT_ID, do_not_service: false },
    { id: VICTIM_ID, tenant_id: TENANT_ID, do_not_service: false },
  ])
  // Repeat-client gate requires >=1 completed booking for the requesting client.
  fake._seed('bookings', [
    { id: 'past-1', tenant_id: TENANT_ID, client_id: OWNER_ID, status: 'completed' },
    { id: 'past-2', tenant_id: TENANT_ID, client_id: VICTIM_ID, status: 'completed' },
  ])
}

function withSession(clientId: string) {
  cookieJar = new Map([['client_session', { value: createClientSession(clientId) }]])
}

function noSession() {
  cookieJar = new Map()
}

const basePayload = {
  frequency: 'weekly',
  start_date: '2026-08-03',
  time: '09:00',
  hours: 2,
}

beforeEach(() => {
  seed()
  noSession()
})

function post(body: Record<string, unknown>) {
  return POST(new Request('http://x/api/client/recurring', { method: 'POST', body: JSON.stringify(body) }))
}

it('blocks an unauthenticated caller from creating a recurring series for another client', async () => {
  noSession()
  const res = await post({ ...basePayload, client_id: VICTIM_ID })
  expect(res.status).toBe(401)
  expect(fake._store.get('recurring_schedules') ?? []).toHaveLength(0)
  // only the 2 seeded 'completed' bookings should exist — none created by the attack
  expect(fake._store.get('bookings')).toHaveLength(2)
})

it("blocks a DIFFERENT client's session from creating a recurring series on the victim's account", async () => {
  withSession(OWNER_ID)
  const res = await post({ ...basePayload, client_id: VICTIM_ID })
  expect(res.status).toBe(403)
  expect(fake._store.get('recurring_schedules') ?? []).toHaveLength(0)
  expect(fake._store.get('bookings')).toHaveLength(2)
})

it('allows a client to create their own recurring series', async () => {
  withSession(OWNER_ID)
  const res = await post({ ...basePayload, client_id: OWNER_ID })
  expect(res.status).toBe(200)
  const schedules = fake._store.get('recurring_schedules') ?? []
  expect(schedules).toHaveLength(1)
  expect(schedules[0].client_id).toBe(OWNER_ID)
  // 2 seeded + newly generated recurring bookings
  expect((fake._store.get('bookings') ?? []).length).toBeGreaterThan(2)
})
