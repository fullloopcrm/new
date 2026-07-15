/**
 * CLIENT PREFERRED-CLEANER AUTH GATE — /api/client/preferred-cleaner GET+PUT.
 *
 * Fleet-wide webhook/cron audit finding, 2026-07-13: unlike every sibling
 * client/* route (bookings, notes, booking/[id], reschedule/[id]), this route
 * never called protectClientAPI(). GET leaked another client's preferred
 * cleaner + full service history to anyone who supplied their client_id, and
 * PUT let anyone overwrite another client's preferred cleaner — no session
 * cookie, no ownership check, just whatever client_id was in the request.
 *
 * This suite proves protectClientAPI() is now actually wired in and its
 * verdict is honored: a denied session gets rejected before any read or
 * write, and a matching session proceeds normally.
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

import { supabaseAdmin } from '@/lib/supabase'
import { GET, PUT } from './route'

const TENANT_ID = 'tenant-A'
const VICTIM_CLIENT_ID = 'client-victim'
const CLEANER_ID = 'cleaner-1'
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  fake._seed('clients', [
    { id: VICTIM_CLIENT_ID, tenant_id: TENANT_ID, preferred_team_member_id: null },
  ])
  fake._seed('team_members', [
    { id: CLEANER_ID, tenant_id: TENANT_ID, active: true },
  ])
})

function getReq(clientId: string): Request {
  return new Request(`http://x/api/client/preferred-cleaner?client_id=${clientId}`)
}

function putReq(clientId: string, cleanerId: string | null): Request {
  return new Request('http://x/api/client/preferred-cleaner', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, preferred_cleaner_id: cleanerId }),
  })
}

describe('GET /api/client/preferred-cleaner — auth gate', () => {
  it('rejects when protectClientAPI denies the session (forged/foreign client_id)', async () => {
    authResult = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const res = await GET(getReq(VICTIM_CLIENT_ID))
    expect(res.status).toBe(403)
  })

  it("returns the client's data when protectClientAPI approves the matching session", async () => {
    authResult = { clientId: VICTIM_CLIENT_ID }
    const res = await GET(getReq(VICTIM_CLIENT_ID))
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/client/preferred-cleaner — auth gate', () => {
  it('rejects a forged update and does not mutate the victim row', async () => {
    authResult = NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    const res = await PUT(putReq(VICTIM_CLIENT_ID, CLEANER_ID))
    expect(res.status).toBe(403)

    const { data } = await fake.from('clients').select('preferred_team_member_id').eq('id', VICTIM_CLIENT_ID).single()
    expect((data as { preferred_team_member_id: unknown } | null)?.preferred_team_member_id).toBeNull()
  })

  it('allows the update when protectClientAPI approves the matching session', async () => {
    authResult = { clientId: VICTIM_CLIENT_ID }
    const res = await PUT(putReq(VICTIM_CLIENT_ID, CLEANER_ID))
    expect(res.status).toBe(200)

    const { data } = await fake.from('clients').select('preferred_team_member_id').eq('id', VICTIM_CLIENT_ID).single()
    expect((data as { preferred_team_member_id: unknown } | null)?.preferred_team_member_id).toBe(CLEANER_ID)
  })
})
