import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/settings/services (create a service/pricing catalog entry) called
 * getTenantForRequest() with zero permission check, while sibling PUT/DELETE
 * on /api/settings/services/[id] already require settings.edit for the same
 * resource. staff has no settings.edit by default -- this was a full authz
 * gap: any authenticated tenant member could add new priced service offerings.
 * GET is left ungated -- it's consumed outside Settings (e.g. the schedules
 * page) by roles that lack settings.view, so gating it would regress
 * legitimate staff functionality.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let order: { col: string; ascending: boolean } | null = null
  let limit: number | null = null
  let insertPayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: (col: string, opts?: { ascending?: boolean }) => { order = { col, ascending: opts?.ascending ?? true }; return c },
    limit: (n: number) => { limit = n; return c },
    insert: (p: Row) => { insertPayload = p; return c },
    single: async () => {
      if (insertPayload) {
        const row = { id: `svc-${rowsOf().length + 1}`, ...insertPayload }
        rowsOf().push(row)
        return { data: row, error: null }
      }
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row || null, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      let rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (order) {
        const { col, ascending } = order
        rows = [...rows].sort((a, b) => (ascending ? 1 : -1) * (((a[col] as number) || 0) - ((b[col] as number) || 0)))
      }
      if (limit != null) rows = rows.slice(0, limit)
      return Promise.resolve(res({ data: rows, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.service_types = []
})

const postReq = (body: unknown) => new Request('http://x', { method: 'POST', body: JSON.stringify(body) })

describe('POST /api/settings/services — permission gate', () => {
  it('403s a staff member, no row created', async () => {
    const res = await POST(postReq({ name: 'Deep Clean' }))
    expect(res.status).toBe(403)
    expect(DB.service_types.length).toBe(0)
  })

  it('allows an admin (has settings.edit) to create a service', async () => {
    currentRole.value = 'admin'
    const res = await POST(postReq({ name: 'Deep Clean' }))
    expect(res.status).toBe(201)
    expect(DB.service_types.length).toBe(1)
  })
})
