import { describe, it, expect, vi } from 'vitest'

/**
 * PUT /api/clients/[id] built its update row from a pick() allow-list that
 * silently dropped unit and special_instructions -- even though the client
 * detail edit page (/dashboard/clients/[id]) renders real inputs for both
 * (a "Unit/Apt" field and a "Special Instructions" textarea) and sends the
 * whole form on save. Staff editing either field would see it silently
 * discarded on reload, with no error. Same allow-list-drops-a-real-field
 * shape as the bookings/batch fix in 8b6486b2.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_ID = 'c1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {
  clients: [{ id: CLIENT_ID, tenant_id: TENANT_A, name: 'Jane Doe', unit: null, special_instructions: null }],
}

function chain(table: string) {
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const filters: Array<(r: Row) => boolean> = []
  let updatePayload: Row | null = null
  const c: Record<string, unknown> = {
    select: () => c,
    update: (p: Row) => { updatePayload = p; return c },
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: () => {
      const rows = rowsOf().filter((r) => filters.every((f) => f(r)))
      if (updatePayload) {
        const row = rows[0]
        if (row) Object.assign(row, updatePayload)
        return Promise.resolve({ data: row || null, error: row ? null : { message: 'not found' } })
      }
      return Promise.resolve({ data: rows[0] || null, error: rows[0] ? null : { message: 'not found' } })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: TENANT_A,
    role: 'manager',
    tenant: { selena_config: {} },
  }),
  AuthError: class AuthError extends Error { status = 401 },
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))

import { PUT } from './route'

function params() {
  return { params: Promise.resolve({ id: CLIENT_ID }) }
}

function jsonReq(body: Row): Request {
  return new Request('http://localhost', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('PUT /api/clients/[id] — unit and special_instructions', () => {
  it('persists unit and special_instructions instead of silently dropping them', async () => {
    const res = await PUT(jsonReq({
      name: 'Jane Doe', unit: 'Apt 4B', special_instructions: 'Ring twice, dog is friendly',
    }), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.unit).toBe('Apt 4B')
    expect(body.client.special_instructions).toBe('Ring twice, dog is friendly')
  })
})
