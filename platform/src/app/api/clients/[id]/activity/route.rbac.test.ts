import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/clients/[id]/activity — permission gate.
 *
 * BUG (fixed here): this handler only called getTenantForRequest() (proves
 * tenant membership at ANY role) with zero permission check, unlike every
 * other route in the /api/clients family (P71), which was gated behind
 * requirePermission('clients.view'). This route reads the same client PII
 * plus booking payment amounts and GPS check-in/out locations, so it was
 * missing the exact same gate its siblings already have.
 *
 * FIX: requirePermission('clients.view'), matching the family convention.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const tenantHolder = vi.hoisted(() => ({
  role: 'owner' as string,
  tenant: { id: 'tid-a' } as Record<string, unknown>,
}))
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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: A,
      tenant: tenantHolder.tenant,
      role: tenantHolder.role,
    })),
  }
})

import { GET } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-a1', tenant_id: A, name: 'Ann', created_at: '2020-01-01' },
    ],
    bookings: [],
    notifications: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
  tenantHolder.role = 'owner'
  tenantHolder.tenant = { id: A }
})

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/clients/[id]/activity — permission probe', () => {
  it('owner (has clients.view) can read a client activity timeline', async () => {
    const res = await GET(new Request('http://t/api/clients/cli-a1/activity'), params('cli-a1'))
    expect(res.status).toBe(200)
  })

  it("PERMISSION PROBE: a tenant that revokes 'clients.view' from staff via a role_permissions override blocks GET for staff", async () => {
    tenantHolder.role = 'staff'
    tenantHolder.tenant = {
      id: A,
      selena_config: { role_permissions: { staff: { 'clients.view': false } } },
    }
    const res = await GET(new Request('http://t/api/clients/cli-a1/activity'), params('cli-a1'))
    expect(res.status).toBe(403)
  })
})
