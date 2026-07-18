import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET /api/cleaners (the live team-list endpoint powering /dashboard/team,
 * BookingsAdmin, and jobs/crews) used to `select('*')` on team_members and
 * return it verbatim. team_members.pin is the plaintext 4-digit portal login
 * PIN, and team.view is held down to the 'staff' role -- so any staff-tier
 * dashboard user could harvest every team member's PIN off this list and log
 * into the team portal as anyone, including leads/managers.
 */

const TENANT = 'tenant-a'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake, __fake: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [
    { id: 'm1', tenant_id: TENANT, name: 'Jane', pin: '1234', phone: '555-0100' },
    { id: 'm2', tenant_id: TENANT, name: 'Bob', pin: '9876', phone: '555-0101' },
  ])
})

describe('GET /api/cleaners — pin exposure', () => {
  it('never includes the plaintext portal-login pin in the response', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body).toHaveLength(2)
    for (const member of body) {
      expect(member).not.toHaveProperty('pin')
    }
  })

  it('still returns the other team-member fields the dashboard needs', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body[0]).toMatchObject({ name: expect.any(String), phone: expect.any(String) })
  })
})
