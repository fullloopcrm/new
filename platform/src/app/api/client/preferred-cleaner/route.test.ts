/**
 * IDOR — /api/client/preferred-cleaner had NO auth check at all. `/api/client(.*)`
 * is exempted from the platform's Clerk/session middleware (each handler is
 * expected to verify the caller independently, e.g. /api/client/properties'
 * authClient() gate), but this route read `client_id` straight from the query
 * string (GET) / body (PUT) and never checked it against the caller's session.
 * Anyone who knew (or guessed) another client's client_id could read their
 * preferred-cleaner history or overwrite it — no client_session cookie needed.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

// createClientSession signs with ADMIN_PASSWORD (lib/nycmaid/auth.ts); it now
// throws rather than falling back to an empty/publicly-computable HMAC key
// when unset, so tests need a real secret configured same as auth.test.ts.
beforeAll(() => {
  process.env.ADMIN_PASSWORD ||= 'test-admin-password'
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

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/nycmaid/auth'
import { GET, PUT } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const OWNER_ID = 'client-owner'
const VICTIM_ID = 'client-victim'
const CLEANER_ID = 'cleaner-1'

function seed() {
  fake._store.clear()
  fake._seed('clients', [
    { id: OWNER_ID, tenant_id: TENANT_ID, do_not_service: false, preferred_team_member_id: null },
    { id: VICTIM_ID, tenant_id: TENANT_ID, do_not_service: false, preferred_team_member_id: null },
  ])
  fake._seed('team_members', [
    { id: CLEANER_ID, tenant_id: TENANT_ID, active: true },
  ])
  fake._seed('bookings', [])
}

function withSession(clientId: string) {
  cookieJar = new Map([['client_session', { value: createClientSession(clientId) }]])
}

function noSession() {
  cookieJar = new Map()
}

beforeEach(() => {
  seed()
  noSession()
})

describe('GET /api/client/preferred-cleaner', () => {
  it('rejects an unauthenticated read of another client', async () => {
    noSession()
    const req = new Request(`http://x/api/client/preferred-cleaner?client_id=${VICTIM_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(401)
  })

  it("rejects reading another client's data with a valid session for a DIFFERENT client", async () => {
    withSession(OWNER_ID)
    const req = new Request(`http://x/api/client/preferred-cleaner?client_id=${VICTIM_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(403)
  })

  it('allows a client to read their own preferred-cleaner data', async () => {
    withSession(OWNER_ID)
    const req = new Request(`http://x/api/client/preferred-cleaner?client_id=${OWNER_ID}`)
    const res = await GET(req)
    expect(res.status).toBe(200)
  })
})

describe('PUT /api/client/preferred-cleaner', () => {
  it("blocks an unauthenticated caller from reassigning another client's preferred cleaner", async () => {
    noSession()
    const req = new Request('http://x/api/client/preferred-cleaner', {
      method: 'PUT',
      body: JSON.stringify({ client_id: VICTIM_ID, preferred_cleaner_id: CLEANER_ID }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(401)
    const victim = fake._store.get('clients')?.find((r: Row) => r.id === VICTIM_ID)
    expect(victim?.preferred_team_member_id).toBeNull()
  })

  it("blocks a DIFFERENT client's session from reassigning the victim's preferred cleaner", async () => {
    withSession(OWNER_ID)
    const req = new Request('http://x/api/client/preferred-cleaner', {
      method: 'PUT',
      body: JSON.stringify({ client_id: VICTIM_ID, preferred_cleaner_id: CLEANER_ID }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(403)
    const victim = fake._store.get('clients')?.find((r: Row) => r.id === VICTIM_ID)
    expect(victim?.preferred_team_member_id).toBeNull()
  })

  it('allows a client to set their own preferred cleaner', async () => {
    withSession(OWNER_ID)
    const req = new Request('http://x/api/client/preferred-cleaner', {
      method: 'PUT',
      body: JSON.stringify({ client_id: OWNER_ID, preferred_cleaner_id: CLEANER_ID }),
    })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const owner = fake._store.get('clients')?.find((r: Row) => r.id === OWNER_ID)
    expect(owner?.preferred_team_member_id).toBe(CLEANER_ID)
  })
})
