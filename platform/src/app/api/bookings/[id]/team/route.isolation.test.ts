import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/bookings/[id]/team (converted to tenantDb).
 *
 * The team roster is read from booking_team_members via tenantDb, which injects
 * `.eq('tenant_id', ctx)`. If tenant A asks for the team of a booking id that
 * actually belongs to tenant B, the roster must come back EMPTY — never the
 * foreign tenant's lead/extra member ids. This is the wrong-tenant probe.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

// PUT-only deps — mocked so importing the route never pulls the real telnyx/SMS stack.
vi.mock('@/lib/notify-team', () => ({
  notifyTeamMember: vi.fn(async () => ({ teamMemberName: 'x' })),
  formatDeliveryReport: vi.fn(() => 'ok'),
}))
vi.mock('@/lib/sms-templates', () => ({ smsJobAssignment: vi.fn(() => 'msg') }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { GET } from './route'

function seed() {
  return {
    booking_team_members: [
      { id: 'btm-a1', booking_id: 'bk-a', tenant_id: CTX_TENANT, team_member_id: 'tm-lead', is_lead: true, position: 1 },
      { id: 'btm-a2', booking_id: 'bk-a', tenant_id: CTX_TENANT, team_member_id: 'tm-extra', is_lead: false, position: 2 },
      { id: 'btm-b1', booking_id: 'bk-b', tenant_id: OTHER_TENANT, team_member_id: 'tm-foreign', is_lead: true, position: 1 },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function ctx(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('bookings/[id]/team GET — tenant isolation', () => {
  it('positive control: tenant A reads its OWN booking team', async () => {
    const res = await GET(new Request('http://t/api/bookings/bk-a/team'), ctx('bk-a'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead).toBe('tm-lead')
    expect(body.extras).toEqual(['tm-extra'])
  })

  it("wrong-tenant probe: tenant B's booking id yields an empty roster, never the foreign member", async () => {
    const res = await GET(new Request('http://t/api/bookings/bk-b/team'), ctx('bk-b'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.lead).toBeNull()
    expect(body.extras).toEqual([])
    // The foreign tenant's team member must not surface under any key.
    expect(JSON.stringify(body)).not.toContain('tm-foreign')
  })
})
