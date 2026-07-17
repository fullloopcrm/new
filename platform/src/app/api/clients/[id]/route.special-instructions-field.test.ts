import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * PUT /api/clients/[id] — special_instructions was silently dropped (fixed here).
 *
 * The admin client-edit form (src/app/dashboard/clients/[id]/page.tsx) has had a
 * "Special Instructions" textarea all along, but this route's pick() allowlist
 * never included special_instructions — every admin edit of that field looked
 * like it saved (200, no error) and silently no-opped. Same column the fixed
 * portal/notes route now reads/writes for the cleaner-facing side; admins need
 * to be able to set/correct it too.
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
    clients: [{ id: 'cli-a', tenant_id: A, name: 'A Client', status: 'active', special_instructions: null }],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

const params = (id: string) => ({ params: Promise.resolve({ id }) })

describe('clients/[id] PUT — special_instructions actually persists', () => {
  it('saves special_instructions instead of silently dropping it', async () => {
    const res = await PUT(
      new Request('http://t/api/clients/cli-a', { method: 'PUT', body: JSON.stringify({ special_instructions: 'Gate code 4821, dog is friendly' }) }),
      params('cli-a'),
    )
    expect(res.status).toBe(200)
    const row = (h.seed.clients as Array<{ id: string; special_instructions?: string }>).find((r) => r.id === 'cli-a')
    expect(row?.special_instructions).toBe('Gate code 4821, dog is friendly')
  })
})
