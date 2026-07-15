import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/preferred-cleaner — auth-gap regression test.
 *
 * BUG (fixed here): GET/PUT took `client_id` straight from the query string /
 * request body with zero authentication. Any caller who knew or guessed a
 * `client_id` UUID could read a client's preferred cleaner + full "familiar
 * cleaners" list, and change their preferred cleaner — no session required
 * (deploy-prep/none-write-routes-triage.md row 2).
 *
 * FIX: both GET and PUT now require a client-portal Bearer token
 * (verifyPortalToken, same mechanism as /api/portal/bookings). client_id is
 * derived from the token, never trusted from the request.
 */

const TOKEN_A = 'token-for-client-a'
const TOKEN_B = 'token-for-client-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('../../portal/auth/token', () => ({
  verifyPortalToken: (token: string) => {
    if (token === TOKEN_A) return { id: 'client-a', tid: 'tid-a' }
    if (token === TOKEN_B) return { id: 'client-b', tid: 'tid-b' }
    return null
  },
}))

import { GET, PUT } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [
      { id: 'client-a', tenant_id: 'tid-a', preferred_team_member_id: null },
      { id: 'client-b', tenant_id: 'tid-b', preferred_team_member_id: 'tm-b1' },
    ],
    bookings: [],
    team_members: [
      { id: 'tm-a1', tenant_id: 'tid-a', active: true },
      { id: 'tm-b1', tenant_id: 'tid-b', active: true },
    ],
  })
  holder.from = h.from
})

function getReq(headers: Record<string, string> = {}) {
  return new Request('http://t/api/client/preferred-cleaner', { headers })
}
function putReq(headers: Record<string, string>, body: unknown) {
  return new Request('http://t/api/client/preferred-cleaner', { method: 'PUT', headers, body: JSON.stringify(body) })
}

describe('client/preferred-cleaner — auth gap fixed', () => {
  it('GET without a token → 401, no client data leaked', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(401)
  })

  it('GET with an invalid token → 401', async () => {
    const res = await GET(getReq({ authorization: 'Bearer garbage' }))
    expect(res.status).toBe(401)
  })

  it('wrong-tenant probe: client A\'s token can never read or derive client B\'s data', async () => {
    const res = await GET(getReq({ authorization: `Bearer ${TOKEN_A}` }))
    expect(res.status).toBe(200)
    const data = await res.json()
    // client-a's preferred_team_member_id is null — must never resolve to
    // client-b's tm-b1, proving the token (not a guessable id) drives identity.
    expect(data.preferred_cleaner_id).toBeNull()
  })

  it('PUT without a token → 401, no write occurs', async () => {
    const res = await PUT(putReq({}, { preferred_cleaner_id: 'tm-a1' }))
    expect(res.status).toBe(401)
    expect(h.capture.updates.find((u) => u.table === 'clients')).toBeUndefined()
  })

  it('PUT scopes the write to the token\'s own client + tenant, cannot touch another tenant\'s team member', async () => {
    // Client A's token tries to set a team member that belongs to tenant B.
    const res = await PUT(putReq({ authorization: `Bearer ${TOKEN_A}` }, { preferred_cleaner_id: 'tm-b1' }))
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'clients')).toBeUndefined()
  })

  it('positive control: PUT with a valid token updates only that client\'s own row', async () => {
    const res = await PUT(putReq({ authorization: `Bearer ${TOKEN_A}` }, { preferred_cleaner_id: 'tm-a1' }))
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'clients')
    expect(update).toBeDefined()
    expect(update!.matched.every((r) => r.id === 'client-a')).toBe(true)
  })
})
