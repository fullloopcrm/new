import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Parity fix: nycmaid's src/app/api/cleaners/[id]/route.ts calls audit() on
 * cleaner update/delete. This FL route is the "legacy nycmaid path" shim over
 * team_members — it must log the same operator-activity trail (dashboard/activity,
 * backed by /api/audit) that every other write route already does.
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>
const auditCalls: Array<Record<string, unknown>> = []

function matchesEq(row: Row, eqs: Record<string, unknown>): boolean {
  return Object.entries(eqs).every(([k, v]) => row[k] === v)
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let updatePayload: Row | null = null
  let isDelete = false

  const rows = (): Row[] => (store[table] || []).filter((row) => matchesEq(row, eqs))

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    update: (payload: Row) => {
      updatePayload = payload
      return chain
    },
    delete: () => {
      isDelete = true
      return chain
    },
    single: () => {
      const matched = rows()
      if (updatePayload) {
        store[table] = (store[table] || []).map((r) =>
          matchesEq(r, eqs) ? { ...r, ...updatePayload } : r,
        )
      }
      return Promise.resolve({ data: matched[0] ? { ...matched[0], ...(updatePayload || {}) } : null, error: null })
    },
    then: (resolve: (v: { data: Row[] | null; error: null }) => unknown) => {
      if (updatePayload) {
        store[table] = (store[table] || []).map((r) =>
          matchesEq(r, eqs) ? { ...r, ...updatePayload } : r,
        )
      }
      if (isDelete) {
        store[table] = (store[table] || []).filter((r) => !matchesEq(r, eqs))
      }
      return resolve({ data: isDelete ? null : rows(), error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 'tenant-nycmaid' }, error: null }),
}))

vi.mock('@/lib/geo', () => ({ geocodeAddress: async () => null }))
vi.mock('@/lib/portal-rbac', () => ({ isPortalRole: () => true }))

vi.mock('@/lib/audit', () => ({
  audit: vi.fn(async (event: Record<string, unknown>) => {
    auditCalls.push(event)
    return { success: true }
  }),
}))

import { PUT, DELETE } from './route'

beforeEach(() => {
  auditCalls.length = 0
  store = {
    team_members: [
      { id: 'cleaner-1', tenant_id: 'tenant-nycmaid', name: 'Original Name', status: 'active' },
    ],
    bookings: [],
    recurring_schedules: [],
  }
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('legacy /api/cleaners/[id] — operator audit trail', () => {
  it('PUT logs a team.updated audit event for the cleaner', async () => {
    const res = await PUT(
      new Request('http://x', { method: 'PUT', body: JSON.stringify({ name: 'New Name', phone: '555-0100' }) }) as unknown as import('next/server').NextRequest,
      params('cleaner-1'),
    )
    expect(res.status).toBe(200)
    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0]).toMatchObject({
      tenantId: 'tenant-nycmaid',
      action: 'team.updated',
      entityType: 'team_member',
      entityId: 'cleaner-1',
    })
  })

  it('DELETE logs a team.deleted audit event for the cleaner', async () => {
    const res = await DELETE(
      new Request('http://x', { method: 'DELETE' }) as unknown as import('next/server').NextRequest,
      params('cleaner-1'),
    )
    expect(res.status).toBe(200)
    expect(auditCalls).toHaveLength(1)
    expect(auditCalls[0]).toMatchObject({
      tenantId: 'tenant-nycmaid',
      action: 'team.deleted',
      entityType: 'team_member',
      entityId: 'cleaner-1',
    })
  })
})
