import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * DELETE /api/clients/:id — a client with booking history is archived
 * (active=false), never hard-deleted; a client with zero bookings is a real
 * delete. Prevents the delete button from silently cascading away a paying
 * client's booking/payment history.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { DELETE } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-history', tenant_id: A, name: 'Has Bookings', status: 'active', active: true },
      { id: 'cli-clean', tenant_id: A, name: 'No Bookings', status: 'active', active: true },
    ],
    bookings: [
      { id: 'bk-1', tenant_id: A, client_id: 'cli-history', status: 'completed' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('DELETE /api/clients/:id — archive vs real delete', () => {
  it('archives (active=false) a client with booking history instead of deleting the row', async () => {
    const res = await DELETE(new Request('http://t/api/clients/cli-history', { method: 'DELETE' }), params('cli-history'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, archived: true, bookingCount: 1 })

    const row = (h.seed.clients as Array<{ id: string; active: boolean }>).find((r) => r.id === 'cli-history')
    expect(row).toBeDefined()
    expect(row?.active).toBe(false)
  })

  it('hard-deletes a client with zero bookings', async () => {
    const res = await DELETE(new Request('http://t/api/clients/cli-clean', { method: 'DELETE' }), params('cli-clean'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toMatchObject({ success: true, archived: false })

    const row = (h.seed.clients as Array<{ id: string }>).find((r) => r.id === 'cli-clean')
    expect(row).toBeUndefined()
  })
})
