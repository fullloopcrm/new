import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * GET /api/settings — settings.view gate.
 *
 * Called getTenantForRequest() directly with zero permission check, despite
 * being the route behind /dashboard/settings (nav-gated on settings.view) —
 * it hands back the FULL tenants row, including every integration secret's
 * ciphertext (resend/telnyx/stripe/anthropic keys). Any authenticated tenant
 * member — including staff, which has no settings.view per rbac.ts — could
 * pull the tenant's entire configuration. Same bug class already fixed on a
 * sibling branch (p1-w3, commit d883c6b8) but never ported here.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
  role: 'staff' as string,
})) as unknown as FakeStoreHandle & { tenantId: string; role: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({
    tenantId: h.tenantId,
    tenant: { id: h.tenantId, selena_config: null, resend_api_key: 'secret-cipher' },
    role: h.role,
  }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { GET } from './route'

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.seq = 0
  h.role = 'staff'
  h.store = {}
})

describe('GET /api/settings — settings.view permission', () => {
  it('rejects a staff member (no settings.view) with 403 and does not leak the tenant row', async () => {
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('allows a manager (has settings.view) to read', async () => {
    h.role = 'manager'
    const res = await GET()
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.tenant.id).toBe('tenant-A')
  })
})
