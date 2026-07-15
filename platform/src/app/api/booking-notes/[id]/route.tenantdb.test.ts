import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 isolation probe for the tenantDb() conversion of DELETE
 * /api/booking-notes/[id]. The note lookup and delete used to carry a manual
 * .eq('tenant_id', ctx.tenantId) filter. Proves a caller can never read or
 * delete a foreign tenant's note row sharing the same note id.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-00000000000b'
const NOTE_ID = 'shared-note-id'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}
const removedStorageKeys: string[] = []

function deleteChain(rows: Row[]) {
  const filters: Array<(r: Row) => boolean> = []
  const dc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return dc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      const toRemove = rows.filter((r) => filters.every((f) => f(r)))
      for (const r of toRemove) {
        const idx = rows.indexOf(r)
        if (idx >= 0) rows.splice(idx, 1)
      }
      resolve({ data: null, error: null })
    },
  }
  return dc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    delete: () => deleteChain(rowsOf()),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (t: string) => chain(t),
    storage: { from: () => ({ remove: (keys: string[]) => { removedStorageKeys.push(...keys); return Promise.resolve({ data: null, error: null }) } }) },
  },
}))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A, role: 'owner', tenant: {} }),
  AuthError: class AuthError extends Error {},
}))

import { NextRequest } from 'next/server'
import { DELETE } from './route'

beforeEach(() => {
  removedStorageKeys.length = 0
  DB.booking_notes = [
    { id: NOTE_ID, tenant_id: TENANT_B, booking_id: 'b-1', content: 'foreign note', images: ['https://x/uploads/foreign.jpg'] },
  ]
})

describe('DELETE /api/booking-notes/[id] — tenantDb scoping', () => {
  it('404s and deletes nothing when the note id belongs to a foreign tenant', async () => {
    const req = new NextRequest(`https://x/api/booking-notes/${NOTE_ID}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: NOTE_ID }) })
    expect(res.status).toBe(404)
    expect(DB.booking_notes).toHaveLength(1)
    expect(removedStorageKeys).toEqual([])
  })

  it('deletes only the caller tenant\'s own note when both tenants share the note id', async () => {
    DB.booking_notes.push({ id: NOTE_ID, tenant_id: TENANT_A, booking_id: 'b-1', content: 'own note', images: [] })
    const req = new NextRequest(`https://x/api/booking-notes/${NOTE_ID}`, { method: 'DELETE' })
    const res = await DELETE(req, { params: Promise.resolve({ id: NOTE_ID }) })
    expect(res.status).toBe(200)
    expect(DB.booking_notes).toHaveLength(1)
    expect(DB.booking_notes[0].tenant_id).toBe(TENANT_B)
  })
})
