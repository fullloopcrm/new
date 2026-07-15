import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/schedule/calendar (booking/client PII + revenue + team utilization
 * for the whole month) called getTenantForRequest() with zero permission
 * check, unlike its sibling data endpoints GET /api/bookings and
 * GET /api/schedules which both require bookings.view/schedules.view. staff
 * has bookings.view by default so this is an RBAC-override-only gap (same
 * shape as the schedules/clients fixes this session) -- any role with
 * bookings.view revoked via tenant customization could still read this.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    gte: (col: string, val: string) => { filters.push((r) => (r[col] as string) >= val); return c },
    lt: (col: string, val: string) => { filters.push((r) => (r[col] as string) < val); return c },
    order: () => c,
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      return Promise.resolve(res({ data: rows, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.bookings = []
  DB.team_members = []
})

const getReq = () => new (require('next/server').NextRequest)('http://x/api/schedule/calendar')

describe('GET /api/schedule/calendar — permission gate', () => {
  it('403s a role lacking bookings.view, no data leaked', async () => {
    currentRole.value = 'viewer_no_perms'
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('allows staff (has bookings.view by default)', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })
})
