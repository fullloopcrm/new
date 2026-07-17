/**
 * PUT /api/team-portal/preferences — shared-notes-blob race regression.
 *
 * team_members.notes also carries team-portal/availability's `availability`
 * key (and the admin dashboard's working_hours/time_off keys). This route
 * now writes via casUpdateTeamMemberNotes (lib/team-member-notes.ts) instead
 * of a plain read-then-write, so a write landing between this route's read
 * and write no longer gets silently reverted.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake }
})

import { PUT } from './route'
import { createToken } from '../auth/token'

const TENANT_A = 'tenant-A'
const WORKER = 'worker-1'

function putReq(body: unknown, token: string): Request {
  return new Request('http://localhost/api/team-portal/preferences', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  h.seq = 0
  h.store = {
    team_members: [{
      id: WORKER,
      tenant_id: TENANT_A,
      notes: JSON.stringify({ availability: { working_days: [1, 2, 3], blocked_dates: ['2026-08-01'] } }),
    }],
  }
})

describe('PUT /api/team-portal/preferences — preserves the availability key already in notes', () => {
  it('does not wipe an existing availability blob when only updating sms_consent', async () => {
    const token = createToken(WORKER, TENANT_A, 25, 'worker')
    const res = await PUT(putReq({ sms_consent: false }, token) as never)
    expect(res.status).toBe(200)

    const stored = JSON.parse(h.store.team_members[0].notes as string)
    expect(stored.sms_consent).toBe(false)
    expect(stored.availability).toEqual({ working_days: [1, 2, 3], blocked_dates: ['2026-08-01'] })
  })
})
