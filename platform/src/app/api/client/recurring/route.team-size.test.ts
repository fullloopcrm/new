/**
 * POST /api/client/recurring computes finalTeamSize (lead cleaner_id + valid
 * extra_cleaner_ids) and stamps it onto the INITIAL batch of bookings, but
 * recurring_schedules never had anywhere to persist it -- cron/generate-
 * recurring's refill (everything past the initial ~6-week batch) built its
 * insert from the schedule alone, silently reverting every later occurrence
 * to solo team_size. team_size is a real billing multiplier (closeout-
 * summary, team-portal/checkout both read it), so this under-billed every
 * multi-person recurring client for the rest of their series, with no error.
 * See 2026_07_17_recurring_schedules_team_size.sql.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

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
const LEAD_ID = 'cleaner-lead'
const EXTRA_ID = 'cleaner-extra'

function seed() {
  fake._store.clear()
  fake._seed('clients', [{ id: OWNER_ID, tenant_id: TENANT_ID, do_not_service: false }])
  fake._seed('bookings', [{ id: 'past-1', tenant_id: TENANT_ID, client_id: OWNER_ID, status: 'completed' }])
  fake._seed('team_members', [
    { id: LEAD_ID, tenant_id: TENANT_ID, active: true },
    { id: EXTRA_ID, tenant_id: TENANT_ID, active: true },
  ])
  currentTenantId = TENANT_ID
  cookieJar = new Map([['client_session', { value: createClientSession(OWNER_ID, TENANT_ID) }]])
}

beforeEach(seed)

const basePayload = {
  frequency: 'weekly',
  start_date: '2026-08-03',
  time: '09:00',
  hours: 2,
  client_id: OWNER_ID,
}

function post(body: Record<string, unknown>) {
  return POST(new Request('http://x/api/client/recurring', { method: 'POST', body: JSON.stringify(body) }))
}

describe('POST /api/client/recurring -- team_size persistence', () => {
  it('persists the multi-person crew size onto recurring_schedules so cron refills stay staffed', async () => {
    const res = await post({ ...basePayload, cleaner_id: LEAD_ID, extra_cleaner_ids: [EXTRA_ID] })
    expect(res.status).toBe(200)
    const schedules = fake._store.get('recurring_schedules') ?? []
    expect(schedules).toHaveLength(1)
    expect(schedules[0].team_size).toBe(2)
  })

  it('leaves team_size null for a solo booking (no extras), matching every read site’s Math.max(1, team_size || 1) fallback', async () => {
    const res = await post({ ...basePayload, cleaner_id: LEAD_ID })
    expect(res.status).toBe(200)
    const schedules = fake._store.get('recurring_schedules') ?? []
    expect(schedules).toHaveLength(1)
    expect(schedules[0].team_size).toBeNull()
  })
})
