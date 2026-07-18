import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/import-clients (a legacy nycmaid-compat bulk importer, distinct
 * from the hardened /api/clients/import) had no array-length cap and no
 * per-field length cap on name/phone/email/address/notes — an authenticated
 * clients.create session could post an unbounded array of unbounded-length
 * strings, looping a sequential insert per row with no batching. Verifies
 * the fix: array length and per-field lengths are capped to match the
 * conventions used by the sibling route and elsewhere in the codebase.
 */

const insertedRows: Record<string, unknown>[] = []

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: 't-1', role: 'admin', tenant: { id: 't-1' } }),
  AuthError: class AuthError extends Error { status = 401 },
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: (row: Record<string, unknown>) => {
        insertedRows.push(row)
        return Promise.resolve({ error: null })
      },
    }),
  },
}))

import { POST } from './route'

function req(body: unknown): Request {
  return new Request('http://x', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => { insertedRows.length = 0 })

describe('POST /api/import-clients — array + field caps', () => {
  it('rejects an array over the max clients cap', async () => {
    const res = await POST(req({ clients: Array.from({ length: 5001 }, (_, i) => ({ name: `c${i}` })) }))
    expect(res.status).toBe(400)
    expect(insertedRows.length).toBe(0)
  })

  it('caps oversized name/phone/email/address/notes fields per row', async () => {
    const res = await POST(req({
      clients: [{
        name: 'Jane Doe',
        phone: '5'.repeat(1000),
        email: 'a'.repeat(1000) + '@example.com',
        address: 'x'.repeat(5000),
        notes: 'y'.repeat(10000),
      }],
    }))
    expect(res.status).toBe(200)
    expect(insertedRows.length).toBe(1)
    const row = insertedRows[0]
    expect((row.phone as string).length).toBeLessThanOrEqual(30)
    expect((row.email as string).length).toBeLessThanOrEqual(254)
    expect((row.address as string).length).toBeLessThanOrEqual(500)
    expect((row.notes as string).length).toBeLessThanOrEqual(2000)
  })

  it('skips rows with an oversized name instead of inserting it raw', async () => {
    const res = await POST(req({ clients: [{ name: 'z'.repeat(500) }] }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.failed).toBe(1)
    expect(insertedRows.length).toBe(0)
  })
})
