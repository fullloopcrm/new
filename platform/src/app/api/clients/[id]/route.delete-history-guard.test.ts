import { describe, it, expect, vi } from 'vitest'

/**
 * DELETE /api/clients/[id] — a client with real history (bookings, payments,
 * deals, etc. all use NO ACTION on delete) can't be hard-deleted; Postgres
 * raises a 23503 FK-violation. Before this, that raw error leaked through as
 * a generic 500 with the Postgres error text. A true duplicate (no history)
 * still deletes cleanly — this only covers the FK-violation branch.
 */

const TENANT = 'tid-a'

vi.mock('@/lib/tenant-supabase', () => ({
  tenantClient: async () => ({
    from: (table: string) => {
      if (table !== 'clients') throw new Error(`unexpected table: ${table}`)
      return {
        delete: () => ({
          eq: () => ({
            eq: () => ({
              select: () => Promise.resolve({
                data: null,
                error: { code: '23503', message: 'update or delete on table "clients" violates foreign key constraint' },
              }),
            }),
          }),
        }),
      }
    },
  }),
}))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return { AuthError }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT, tenant: { id: TENANT }, role: 'owner', userId: 'u1' },
    error: null,
  }),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { DELETE } from './route'

describe('DELETE /api/clients/[id] — history guard', () => {
  it('returns a clear 409 (not a raw 500) when the client has FK-referenced history', async () => {
    const res = await DELETE(
      new Request('http://t/api/clients/cli-a', { method: 'DELETE' }),
      { params: Promise.resolve({ id: 'cli-a' }) },
    )
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.error).toBe('has_history')
    expect(body.message).toMatch(/bookings|payments|history/i)
  })
})
