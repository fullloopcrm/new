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
 * FIX: both GET and PUT now require a client-portal session cookie
 * (protectClientAPI, same signed-cookie mechanism as client/recurring and
 * the client-idor.isolation.test.ts sibling) scoped to the tenant resolved
 * from the request's signed headers (getTenantFromHeaders). A forged/absent
 * cookie, or one minted for a different tenant/client, is rejected before
 * any client row is read or written.
 */

const mockCookie = { value: undefined as string | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (_n: string) => (mockCookie.value ? { value: mockCookie.value } : undefined) }),
}))

const tenantCtx: { value: { id: string } | null } = { value: null }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx.value }))

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

import { createClientSession } from '@/lib/client-auth'
import { GET, PUT } from './route'

let h: Harness
beforeEach(() => {
  process.env.PORTAL_SECRET = 'unit-test-portal-secret'
  mockCookie.value = undefined
  tenantCtx.value = { id: 'tid-a' }
  h = createTenantDbHarness({
    clients: [
      { id: 'client-a', tenant_id: 'tid-a', preferred_team_member_id: null, do_not_service: false },
      { id: 'client-b', tenant_id: 'tid-b', preferred_team_member_id: 'tm-b1', do_not_service: false },
    ],
    bookings: [],
    team_members: [
      { id: 'tm-a1', tenant_id: 'tid-a', active: true },
      { id: 'tm-b1', tenant_id: 'tid-b', active: true },
    ],
  })
  holder.from = h.from
})

function getReq(clientId?: string) {
  const qs = clientId ? `?client_id=${clientId}` : ''
  return new Request(`http://t/api/client/preferred-cleaner${qs}`)
}
function putReq(body: unknown) {
  return new Request('http://t/api/client/preferred-cleaner', { method: 'PUT', body: JSON.stringify(body) })
}

describe('client/preferred-cleaner — auth gap fixed', () => {
  it('GET without a session cookie → 401, no client data leaked', async () => {
    const res = await GET(getReq('client-a'))
    expect(res.status).toBe(401)
  })

  it('GET with a garbage session cookie → 401', async () => {
    mockCookie.value = 'garbage'
    const res = await GET(getReq('client-a'))
    expect(res.status).toBe(401)
  })

  it("wrong-tenant probe: client A's session can never read or derive client B's data", async () => {
    mockCookie.value = createClientSession('client-a', 'tid-a')
    const res = await GET(getReq('client-a'))
    expect(res.status).toBe(200)
    const data = await res.json()
    // client-a's preferred_team_member_id is null — must never resolve to
    // client-b's tm-b1, proving the session (not a guessable id) drives identity.
    expect(data.preferred_cleaner_id).toBeNull()
  })

  it('PUT without a session cookie → 401, no write occurs', async () => {
    const res = await PUT(putReq({ client_id: 'client-a', preferred_cleaner_id: 'tm-a1' }))
    expect(res.status).toBe(401)
    expect(h.capture.updates.find((u) => u.table === 'clients')).toBeUndefined()
  })

  it("PUT scopes the write to the session's own client + tenant, cannot touch another tenant's team member", async () => {
    // Client A's session tries to set a team member that belongs to tenant B.
    mockCookie.value = createClientSession('client-a', 'tid-a')
    const res = await PUT(putReq({ client_id: 'client-a', preferred_cleaner_id: 'tm-b1' }))
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'clients')).toBeUndefined()
  })

  it("positive control: PUT with a valid session updates only that client's own row", async () => {
    mockCookie.value = createClientSession('client-a', 'tid-a')
    const res = await PUT(putReq({ client_id: 'client-a', preferred_cleaner_id: 'tm-a1' }))
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'clients')
    expect(update).toBeDefined()
    expect(update!.matched.every((r) => r.id === 'client-a')).toBe(true)
  })
})
