import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * GET/POST/PATCH/DELETE /api/crews previously called getTenantForRequest()
 * with no requirePermission check at all -- any authenticated tenant member
 * (incl. 'staff', the default role, which has no crew-management permission
 * at all) could create, rename, delete, or re-staff any crew. Ported from
 * sibling-branch commit 120dd9ff (gated on schedules.view/create/edit, the
 * same tier the crew-assignment paths in jobs/[id]/sessions already use).
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const { currentRole } = vi.hoisted(() => ({ currentRole: { value: 'staff' } }))

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let op: 'select' | 'insert' | 'update' | 'delete' = 'select'
  let payload: Row | Row[] = {}
  const c: Record<string, unknown> = {
    select: () => c,
    insert: (p: Row | Row[]) => { op = 'insert'; payload = p; return c },
    update: (p: Row) => { op = 'update'; payload = p; return c },
    delete: () => { op = 'delete'; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    order: () => c,
    single: async () => {
      if (op === 'insert') {
        const rows = Array.isArray(payload) ? payload : [payload]
        const inserted = rows.map((r) => ({ id: `crew-${rowsOf().length + 1}`, ...r }))
        DB[table] = [...rowsOf(), ...inserted]
        return { data: inserted[0], error: null }
      }
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: row ? null : { message: 'not found' } }
    },
    maybeSingle: async () => {
      const row = rowsOf().find((r) => filters.every((f) => f(r)))
      return { data: row ?? null, error: null }
    },
    then: (res: (v: { data: unknown; error: unknown }) => unknown) => {
      if (op === 'update') { rowsOf().filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, payload)); return Promise.resolve(res({ data: null, error: null })) }
      if (op === 'delete') { DB[table] = rowsOf().filter((r) => !filters.every((f) => f(r))); return Promise.resolve(res({ data: null, error: null })) }
      return Promise.resolve(res({ data: rowsOf().filter((r) => filters.every((f) => f(r))), error: null }))
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: currentRole.value, tenant: {} }),
  AuthError: class AuthError extends Error { status = 401 },
}))

import { GET, POST, PATCH, DELETE } from './route'

beforeEach(() => {
  currentRole.value = 'staff'
  DB.crews = [{ id: 'crew-1', tenant_id: TENANT_A, name: 'A Team', active: true }]
  DB.crew_members = []
  DB.team_members = []
})

const postReq = (body: unknown) => new Request('http://x/api/crews', { method: 'POST', body: JSON.stringify(body) })
const patchReq = (body: unknown) => new Request('http://x/api/crews', { method: 'PATCH', body: JSON.stringify(body) })
const deleteReq = (id: string) => new Request(`http://x/api/crews?id=${id}`, { method: 'DELETE' })

describe('/api/crews — permission gate', () => {
  it('allows a staff member on GET (staff has schedules.view)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
  })

  it('403s a staff member creating a crew, no row inserted', async () => {
    const res = await POST(postReq({ name: 'New Crew' }))
    expect(res.status).toBe(403)
    expect(DB.crews.length).toBe(1)
  })

  it('403s a staff member renaming a crew, row untouched', async () => {
    const res = await PATCH(patchReq({ id: 'crew-1', name: 'Renamed' }))
    expect(res.status).toBe(403)
    expect(DB.crews[0].name).toBe('A Team')
  })

  it('403s a staff member deleting a crew, row survives', async () => {
    const res = await DELETE(deleteReq('crew-1'))
    expect(res.status).toBe(403)
    expect(DB.crews.length).toBe(1)
  })

  it('allows a manager (has schedules.view/create/edit) to list and create', async () => {
    currentRole.value = 'manager'
    const getRes = await GET()
    expect(getRes.status).toBe(200)
    const postRes = await POST(postReq({ name: 'New Crew' }))
    expect(postRes.status).toBe(200)
    expect(DB.crews.length).toBe(2)
  })
})
