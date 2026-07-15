import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET /api/security/events previously called getTenantForRequest() with no
 * requirePermission check -- any authenticated tenant member (incl. 'staff'
 * and 'manager', which lack audit.view) could read the tenant's security
 * event log (logins, password/API-key changes, member removals, suspicious
 * logins -- including IP address and user agent). Now gated on audit.view,
 * matching the sibling audit log (/api/audit).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  security_events: [
    { id: 'evt-1', tenant_id: TENANT_A, type: 'suspicious_login', ip_address: '1.2.3.4', user_agent: 'curl/8', created_at: '2026-07-01T00:00:00Z' },
  ],
}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  let filters: Array<[string, unknown]> = []
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (k: string, v: unknown) => { filters.push([k, v]); return c },
    order: () => c,
    limit: async () => ({ data: rowsOf().filter((r) => filters.every(([k, v]) => r[k] === v)), error: null }),
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
})

const getReq = () => new Request('http://x?limit=10')

describe('/api/security/events — permission gate', () => {
  it('403s a staff member (no audit.view)', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('403s a manager (no audit.view by default)', async () => {
    currentRole.value = 'manager'
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('allows an admin (has audit.view) and returns events', async () => {
    currentRole.value = 'admin'
    const res = await GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.events.length).toBe(1)
  })
})
