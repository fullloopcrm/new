import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/client/booking/[id] — bookings.team_member_token/
 * token_expires_at redaction probe.
 *
 * BUG (fixed here): `select('*, team_members!bookings_team_member_id_fkey(name))'`
 * then `return NextResponse.json(data)` — the whole bookings row, unredacted,
 * on the client's own single-booking detail endpoint (consumed by
 * `site/*\/book/dashboard` and `book/reschedule/[id]` pages across every
 * tenant site). `bookings.team_member_token` is a fresh crypto-random token
 * generated and stored on every booking (client/book, client/recurring,
 * admin/recurring-schedules, bookings/batch all write it) — schema.sql's
 * `worker_token` column comment describes this same field under its stale
 * pre-rename name (admin/recurring-schedules/route.ts's own doc comment
 * confirms the live column is `team_member_token`). Grepped every read site
 * in the repo: nothing validates either name as a credential.
 *
 * FIX: redact via omit() before returning, same invariant as the
 * clients.pin/team_members.pin fixes.
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

const SECRET_TEAM_MEMBER_TOKEN = 'tmtok_live_secret_xyz789'
const SECRET_LEGACY_WORKER_TOKEN = 'wtok_legacy_secret_xyz789'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    bookings: [
      {
        id: 'bk-1', tenant_id: 'tid-a', client_id: 'client-a',
        start_time: '2026-08-01T10:00:00Z',
        team_member_token: SECRET_TEAM_MEMBER_TOKEN, worker_token: SECRET_LEGACY_WORKER_TOKEN,
        token_expires_at: '2026-08-01T12:00:00Z',
        team_members: { name: 'Crew A' },
      },
    ],
  })
  holder.from = h.from
})

function params() {
  return { params: Promise.resolve({ id: 'bk-1' }) }
}

describe('client/booking/[id] — team_member_token redaction probe', () => {
  it('never returns bookings.team_member_token (the live, actively-written field)', async () => {
    const res = await GET(new Request('http://t/api/client/booking/bk-1'), params())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.team_member_token).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(SECRET_TEAM_MEMBER_TOKEN)
  })

  it('never returns bookings.worker_token (the stale legacy name, redacted defensively)', async () => {
    const res = await GET(new Request('http://t/api/client/booking/bk-1'), params())
    const body = await res.json()
    expect(body.worker_token).toBeUndefined()
    expect(JSON.stringify(body)).not.toContain(SECRET_LEGACY_WORKER_TOKEN)
  })

  it('never returns bookings.token_expires_at', async () => {
    const res = await GET(new Request('http://t/api/client/booking/bk-1'), params())
    const body = await res.json()
    expect(body.token_expires_at).toBeUndefined()
  })

  it('CONTROL: still returns the fields the client dashboard actually uses', async () => {
    const res = await GET(new Request('http://t/api/client/booking/bk-1'), params())
    const body = await res.json()
    expect(body.id).toBe('bk-1')
    expect(body.start_time).toBe('2026-08-01T10:00:00Z')
    expect(body.team_members.name).toBe('Crew A')
  })
})
