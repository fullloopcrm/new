import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * client/preferred-cleaner PUT — terminated-crew guard (P1/W2 fresh-ground,
 * gap #12 closed, lower-severity half).
 *
 * BUG (fixed here): only checked team_members.active, which HR termination
 * never touches (deliberate — see hr.ts). A client could set — and
 * scoreTeamForBooking would then keep favoring with its strongest possible
 * signal, "Client's preferred tech" (+200) — a team member who no longer
 * works here at all.
 */

const TOKEN_A = 'token-for-client-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('../../portal/auth/token', () => ({
  verifyPortalToken: (token: string) => {
    if (token === TOKEN_A) return { id: 'client-a', tid: 'tid-a' }
    return null
  },
}))

import { PUT } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    clients: [{ id: 'client-a', tenant_id: 'tid-a', preferred_team_member_id: null }],
    bookings: [],
    team_members: [
      { id: 'tm-terminated', tenant_id: 'tid-a', active: true },
      { id: 'tm-active', tenant_id: 'tid-a', active: true },
    ],
    hr_employee_profiles: [
      { id: 'p1', tenant_id: 'tid-a', team_member_id: 'tm-terminated', hr_status: 'terminated' },
      { id: 'p2', tenant_id: 'tid-a', team_member_id: 'tm-active', hr_status: 'active' },
    ],
  })
  holder.from = h.from
})

function putReq(headers: Record<string, string>, body: unknown) {
  return new Request('http://t/api/client/preferred-cleaner', { method: 'PUT', headers, body: JSON.stringify(body) })
}

describe('client/preferred-cleaner PUT — terminated-crew guard', () => {
  it('BLOCKED: setting a terminated member as preferred 400s, no write occurs', async () => {
    const res = await PUT(putReq({ authorization: `Bearer ${TOKEN_A}` }, { preferred_cleaner_id: 'tm-terminated' }))
    expect(res.status).toBe(400)
    expect(h.capture.updates.find((u) => u.table === 'clients')).toBeUndefined()
  })

  it('CONTROL: setting an active member as preferred still succeeds', async () => {
    const res = await PUT(putReq({ authorization: `Bearer ${TOKEN_A}` }, { preferred_cleaner_id: 'tm-active' }))
    expect(res.status).toBe(200)
    const update = h.capture.updates.find((u) => u.table === 'clients')
    expect(update?.values.preferred_team_member_id).toBe('tm-active')
  })
})
