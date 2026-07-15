/**
 * IDOR — /api/client/recurring had NO auth check at all. `/api/client(.*)` is
 * exempted from the platform's Clerk/session middleware (each handler must
 * verify the caller independently, e.g. /api/client/properties' authClient()
 * gate), but this route took `client_id` straight from the request body and
 * spun up a real 6-week recurring booking series (discounted pricing) for
 * whichever client_id was supplied — no client_session cookie needed. Anyone
 * who knew another client's id could book real, priced, recurring work onto
 * their account and reassign their preferred cleaner.
 *
 * The subsequent auth check also used lib/nycmaid/auth's protectClientAPI —
 * signed with the platform-wide ADMIN_PASSWORD, no tenant binding — instead of
 * lib/client-auth's tenant-bound version (PORTAL_SECRET-signed, tenant id in
 * the payload) that /api/client/login + /api/client/verify-code actually issue
 * and every sibling /api/client/* route uses. Tests below exercise the fixed
 * (tenant-bound) session path.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

// createClientSession signs with PORTAL_SECRET (lib/client-auth.ts); it now
// throws rather than falling back to an empty/publicly-computable HMAC key
// when unset, so tests need a real secret configured.
beforeAll(() => {
  process.env.PORTAL_SECRET ||= 'test-portal-secret'
})

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

let currentTenantId: string
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: currentTenantId }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
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
  currentTenantId = TENANT_ID
}

function withSession(clientId: string) {
  cookieJar = new Map([['client_session', { value: createClientSession(clientId, TENANT_ID) }]])
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

// cleaner_id/extra_cleaner_ids/property_id were written straight into
// recurring_schedules + 6 future bookings (+ clients.preferred_team_member_id)
// with zero check they belonged to the caller's own tenant.
const OTHER_TENANT_ID = 'tenant-2'

it("rejects a cleaner_id belonging to a DIFFERENT tenant, and does not reassign preferred_team_member_id", async () => {
  fake._seed('team_members', [{ id: 'foreign-cleaner', tenant_id: OTHER_TENANT_ID, active: true }])
  withSession(OWNER_ID)
  const res = await post({ ...basePayload, client_id: OWNER_ID, cleaner_id: 'foreign-cleaner' })
  expect(res.status).toBe(400)
  expect(fake._store.get('recurring_schedules') ?? []).toHaveLength(0)
  const owner = (fake._store.get('clients') ?? []).find((c) => c.id === OWNER_ID)
  expect(owner?.preferred_team_member_id).toBeUndefined()
})

it('rejects an inactive cleaner_id even when it belongs to the right tenant', async () => {
  fake._seed('team_members', [{ id: 'inactive-cleaner', tenant_id: TENANT_ID, active: false }])
  withSession(OWNER_ID)
  const res = await post({ ...basePayload, client_id: OWNER_ID, cleaner_id: 'inactive-cleaner' })
  expect(res.status).toBe(400)
  expect(fake._store.get('recurring_schedules') ?? []).toHaveLength(0)
})

it('rejects an extra_cleaner_id belonging to a DIFFERENT tenant', async () => {
  fake._seed('team_members', [
    { id: 'lead-cleaner', tenant_id: TENANT_ID, active: true },
    { id: 'foreign-extra', tenant_id: OTHER_TENANT_ID, active: true },
  ])
  withSession(OWNER_ID)
  const res = await post({
    ...basePayload,
    client_id: OWNER_ID,
    cleaner_id: 'lead-cleaner',
    extra_cleaner_ids: ['foreign-extra'],
  })
  expect(res.status).toBe(400)
  expect(fake._store.get('recurring_schedules') ?? []).toHaveLength(0)
})

it("rejects a property_id belonging to a DIFFERENT tenant's client", async () => {
  fake._seed('client_properties', [{ id: 'foreign-property', tenant_id: OTHER_TENANT_ID }])
  withSession(OWNER_ID)
  const res = await post({ ...basePayload, client_id: OWNER_ID, property_id: 'foreign-property' })
  expect(res.status).toBe(404)
  expect(fake._store.get('recurring_schedules') ?? []).toHaveLength(0)
})

it('allows a valid same-tenant, active cleaner_id + property_id', async () => {
  fake._seed('team_members', [{ id: 'good-cleaner', tenant_id: TENANT_ID, active: true }])
  fake._seed('client_properties', [{ id: 'good-property', tenant_id: TENANT_ID }])
  withSession(OWNER_ID)
  const res = await post({
    ...basePayload,
    client_id: OWNER_ID,
    cleaner_id: 'good-cleaner',
    property_id: 'good-property',
  })
  expect(res.status).toBe(200)
  const owner = (fake._store.get('clients') ?? []).find((c) => c.id === OWNER_ID)
  expect(owner?.preferred_team_member_id).toBe('good-cleaner')
})
