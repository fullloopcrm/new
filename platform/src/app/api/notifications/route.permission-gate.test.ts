import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST /api/notifications (admin in-app notification feed + 15-min-
 * warning sender) called getTenantForRequest() directly with zero
 * permission check. notifications.view is a defined RBAC permission every
 * default role happens to hold, so the gap only bites when a tenant
 * revokes notifications.view from a role via a per-tenant override
 * (selena_config.role_permissions) -- same asymmetric-gating class as the
 * leads/clients/schedules fixes on this branch.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole, currentOverrides } = vi.hoisted(() => ({
  currentRole: { value: 'staff' },
  currentOverrides: { value: undefined as Record<string, Record<string, boolean>> | undefined },
}))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let insertPayload: Row | null = null
  let updatePayload: Row | null = null
  let countMode = false
  const c: Record<string, unknown> = {
    select: (_cols?: string, opts?: { count?: string; head?: boolean }) => {
      if (opts?.count) countMode = true
      return c
    },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    is: () => c,
    in: (col: string, vals: unknown[]) => { filters.push((r) => vals.includes(r[col])); return c },
    order: () => c,
    limit: () => c,
    insert: (p: Row) => { insertPayload = p; return c },
    update: (p: Row) => { updatePayload = p; return c },
    single: async () => ({ data: null, error: null }),
    then: (res: (v: { data: unknown; error: unknown; count?: number }) => unknown) => {
      if (insertPayload) {
        rowsOf().push({ id: `n-${rowsOf().length + 1}`, ...insertPayload })
        return Promise.resolve(res({ data: null, error: null }))
      }
      if (updatePayload) {
        for (const r of rowsOf()) if (filters.every((f) => f(r))) Object.assign(r, updatePayload)
        return Promise.resolve(res({ data: null, error: null }))
      }
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (countMode) return Promise.resolve(res({ data: null, error: null, count: rows.length }))
      return Promise.resolve(res({ data: rows, error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_A,
    role: currentRole.value,
    tenant: { selena_config: { role_permissions: currentOverrides.value } },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { NextRequest } from 'next/server'
import { GET, POST } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  currentOverrides.value = undefined
  DB.notifications = []
})

const postReq = (body: unknown) => new NextRequest('http://x/api/notifications', { method: 'POST', body: JSON.stringify(body) })
const getReq = () => new NextRequest('http://x/api/notifications')

describe('/api/notifications — permission gate', () => {
  it('allows staff (has notifications.view by default) on GET', async () => {
    const res = await GET(getReq())
    expect(res.status).toBe(200)
  })

  it('403s a role with notifications.view explicitly revoked via tenant override, on GET', async () => {
    currentOverrides.value = { staff: { 'notifications.view': false } }
    const res = await GET(getReq())
    expect(res.status).toBe(403)
  })

  it('403s a role with notifications.view revoked, on POST, no row created', async () => {
    currentOverrides.value = { staff: { 'notifications.view': false } }
    const res = await POST(postReq({ type: '15min_warning' }))
    expect(res.status).toBe(403)
    expect(DB.notifications.length).toBe(0)
  })

  it('allows staff on POST (default permission intact)', async () => {
    const res = await POST(postReq({ type: '15min_warning' }))
    expect(res.status).toBe(200)
    expect(DB.notifications.length).toBe(1)
  })
})
