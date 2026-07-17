import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * GET /api/team-portal/jobs?available=true — is_emergency passthrough probe.
 * The open (self-claim) pool select previously omitted is_emergency
 * entirely, so a tech browsing unclaimed jobs had no way to see which ones
 * were same-day emergencies even though every other masked field (price,
 * service_type, area) was already exposed. Verifies the masked response now
 * carries the flag through for both emergency and routine bookings.
 */

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

import { supabaseAdmin } from '@/lib/supabase'
import { createToken } from '../auth/token'
import { GET } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('team_members', [{ id: 'tm-a', tenant_id: TENANT_ID, status: 'active' }])
  fake._seed('tenants', [{ id: TENANT_ID, selena_config: null }])
  fake._seed('bookings', [
    { id: 'bk-urgent', tenant_id: TENANT_ID, team_member_id: null, status: 'scheduled', is_emergency: true, start_time: '2099-01-01T10:00:00Z', end_time: '2099-01-01T12:00:00Z', service_type: 'Emergency Plumbing', price: 300, clients: { address: '10001 Main St' } },
    { id: 'bk-routine', tenant_id: TENANT_ID, team_member_id: null, status: 'scheduled', is_emergency: false, start_time: '2099-01-01T10:00:00Z', end_time: '2099-01-01T12:00:00Z', service_type: 'Routine Cleaning', price: 100, clients: { address: '90210 Other St' } },
  ])
})

function req(token: string): NextRequest {
  return new NextRequest('http://x/api/team-portal/jobs?available=true', {
    headers: { authorization: `Bearer ${token}` },
  })
}

describe('team-portal/jobs GET (available pool) — is_emergency passthrough', () => {
  it('marks an emergency booking as is_emergency:true in the masked pool response', async () => {
    const token = createToken('tm-a', TENANT_ID)
    const res = await GET(req(token))
    expect(res.status).toBe(200)
    const body = await res.json()
    const urgent = body.jobs.find((j: { id: string }) => j.id === 'bk-urgent')
    expect(urgent.is_emergency).toBe(true)
  })

  it('marks a routine booking as is_emergency:false, not undefined/null', async () => {
    const token = createToken('tm-a', TENANT_ID)
    const res = await GET(req(token))
    expect(res.status).toBe(200)
    const body = await res.json()
    const routine = body.jobs.find((j: { id: string }) => j.id === 'bk-routine')
    expect(routine.is_emergency).toBe(false)
  })
})
