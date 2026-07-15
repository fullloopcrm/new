import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/admin/smart-schedule — schedules.view gate (broad-hunt:
 * session-auth only, no requirePermission check). Every built-in role
 * (including 'staff') holds schedules.view by default per rbac.ts, so no
 * legitimate caller loses access — this closes the "zero permission
 * required" hole and makes the route respect a tenant's role_permissions
 * override, which getTenantForRequest() alone ignores.
 */

const h = vi.hoisted(() => ({
  role: 'staff' as string,
  selenaConfig: null as Record<string, unknown> | null,
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: 'tenant-A',
    tenant: { selena_config: h.selenaConfig },
    role: h.role,
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/smart-schedule', () => ({
  scoreTeamForBooking: async () => [],
  pickBestTeam: () => null,
  suggestBookingSlots: async () => [],
}))

import { GET } from './route'

const getReq = (qs: string) => new Request(`http://x/api/admin/smart-schedule?${qs}`)

beforeEach(() => {
  h.role = 'staff'
  h.selenaConfig = null
})

describe('GET /api/admin/smart-schedule — schedules.view permission', () => {
  it('allows a staff member (has schedules.view by default) to score cleaners', async () => {
    const res = await GET(getReq('date=2026-08-01&start_time=09:00&address=123+Main+St'))
    expect(res.status).toBe(200)
  })

  it('allows an owner through', async () => {
    h.role = 'owner'
    const res = await GET(getReq('date=2026-08-01&start_time=09:00&address=123+Main+St'))
    expect(res.status).toBe(200)
  })

  it('rejects a role with schedules.view revoked via tenant override, proving the gate is live', async () => {
    h.selenaConfig = { role_permissions: { staff: { 'schedules.view': false } } }
    const res = await GET(getReq('date=2026-08-01&start_time=09:00&address=123+Main+St'))
    expect(res.status).toBe(403)
  })
})
