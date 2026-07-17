import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/clients/[id] — unit was silently dropped (fixed here).
 *
 * The admin client-edit form (src/app/dashboard/clients/[id]/page.tsx) has had a
 * "Unit/Apt" input bound to form.unit all along, and the read side already
 * displays client.unit next to the address. But this route's pick() allowlist
 * never included `unit` (a real column on `clients`, supabase/schema.sql:102,
 * distinct from client_properties.unit) — every admin edit of Unit/Apt looked
 * like it saved (200, no error) and silently no-opped. Same bug class as the
 * special_instructions gap fixed earlier this round; found via a sweep of the
 * other pick()-allowlist routes for the same shape.
 */

const A = 'tid-a'
const B = 'tid-b'

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

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({
    tenant: { tenantId: A, tenant: { id: A }, role: 'owner', userId: 'u1' },
    error: null,
  })),
}))

vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))

import { PUT } from './route'

function seed() {
  return {
    clients: [
      { id: 'cli-a', tenant_id: A, name: 'A Client', status: 'active', unit: null },
      { id: 'cli-b', tenant_id: B, name: 'B Client', status: 'active', unit: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('clients/[id] PUT — unit actually persists', () => {
  it('saves unit instead of silently dropping it', async () => {
    const res = await PUT(
      new Request('http://t/api/clients/cli-a', { method: 'PUT', body: JSON.stringify({ unit: 'Apt 4B' }) }),
      params('cli-a'),
    )
    expect(res.status).toBe(200)
    const row = (h.seed.clients as Array<{ id: string; unit?: string }>).find((r) => r.id === 'cli-a')
    expect(row?.unit).toBe('Apt 4B')
  })

  it('wrong-tenant probe: PUT of a foreign tenant client never sets unit', async () => {
    await PUT(
      new Request('http://t/api/clients/cli-b', { method: 'PUT', body: JSON.stringify({ unit: 'HIJACK' }) }),
      params('cli-b'),
    )
    const row = (h.seed.clients as Array<{ id: string; unit?: string | null }>).find((r) => r.id === 'cli-b')
    expect(row?.unit).toBeNull()
  })
})
