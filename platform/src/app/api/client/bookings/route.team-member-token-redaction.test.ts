import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/client/bookings — bookings.team_member_token/token_expires_at
 * redaction probe.
 *
 * BUG (fixed here): both the `upcoming` and `past` queries do
 * `select('*, team_members!bookings_team_member_id_fkey(name))'` and the raw
 * rows were returned verbatim in the JSON response — the client's own
 * booking-history endpoint (consumed by `site/*\/book/dashboard` across
 * every tenant site). Same exposure as client/booking/[id] and
 * client/reschedule/[id]: `bookings.team_member_token` is a fresh
 * crypto-random token generated and stored on every booking, with zero
 * legitimate reader anywhere in the repo (schema.sql's `worker_token`
 * column comment describes the same field under its stale pre-rename name).
 *
 * FIX: map both arrays through omit() before returning.
 */

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a' })),
}))
vi.mock('@/lib/client-auth', () => ({
  protectClientAPI: vi.fn(async () => ({ clientId: 'client-a' })),
}))

import { GET } from './route'

const SECRET_UPCOMING_TOKEN = 'tmtok_upcoming_secret'
const SECRET_PAST_TOKEN = 'tmtok_past_secret'
const SECRET_LEGACY_WORKER_TOKEN = 'wtok_legacy_secret'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [{ id: 'client-a', tenant_id: 'tid-a', email: null, phone: null, do_not_service: false }],
    bookings: [
      {
        id: 'bk-future', tenant_id: 'tid-a', client_id: 'client-a', status: 'scheduled',
        start_time: '2999-01-01T10:00:00Z',
        team_member_token: SECRET_UPCOMING_TOKEN, worker_token: SECRET_LEGACY_WORKER_TOKEN,
        token_expires_at: '2999-01-01T12:00:00Z',
        team_members: { name: 'Crew A' },
      },
      {
        id: 'bk-past', tenant_id: 'tid-a', client_id: 'client-a', status: 'completed',
        start_time: '2000-01-01T10:00:00Z',
        team_member_token: SECRET_PAST_TOKEN, token_expires_at: '2000-01-01T12:00:00Z',
        team_members: { name: 'Crew B' },
      },
    ],
  })
  holder.from = h.from
})

function req(): Request {
  return new Request('http://t/api/client/bookings?client_id=client-a')
}

describe('client/bookings — team_member_token redaction probe', () => {
  it('never returns team_member_token on the upcoming list (the live, actively-written field)', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.upcoming[0].team_member_token).toBeUndefined()
    expect(JSON.stringify(body.upcoming)).not.toContain(SECRET_UPCOMING_TOKEN)
  })

  it('never returns team_member_token on the past list', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(body.past[0].team_member_token).toBeUndefined()
    expect(JSON.stringify(body.past)).not.toContain(SECRET_PAST_TOKEN)
  })

  it('never returns worker_token (the stale legacy name, redacted defensively)', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(body.upcoming[0].worker_token).toBeUndefined()
    expect(JSON.stringify(body.upcoming)).not.toContain(SECRET_LEGACY_WORKER_TOKEN)
  })

  it('never returns token_expires_at on either list', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(body.upcoming[0].token_expires_at).toBeUndefined()
    expect(body.past[0].token_expires_at).toBeUndefined()
  })

  it('CONTROL: still returns the fields the dashboard actually uses', async () => {
    const res = await GET(req())
    const body = await res.json()
    expect(body.upcoming[0].id).toBe('bk-future')
    expect(body.upcoming[0].team_members.name).toBe('Crew A')
    expect(body.past[0].id).toBe('bk-past')
  })
})
