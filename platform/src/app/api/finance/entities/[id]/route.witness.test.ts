/**
 * PATCH /api/finance/entities/[id] — deactivate-default-entity bypass.
 *
 * DELETE on this route blocks archiving the default entity ("Cannot archive
 * the default entity. Set another as default first.") because
 * getDefaultEntityId() (lib/entity.ts) has no `active` filter: invoices,
 * expenses, and bank-accounts all fall back to it when no entity_id is
 * given, so a deactivated default entity keeps silently receiving new
 * financial records even though listEntities() (`.eq('active', true)`)
 * makes it vanish from every entity picker. PATCH {active: false} reached
 * the identical end state with no such guard. Fixed by mirroring DELETE's
 * check inside PATCH.
 */
import { describe, it, expect, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

const { TENANT_A } = vi.hoisted(() => ({ TENANT_A: 'tenant-A' }))

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase({
    entities: [
      { id: 'ent-default', tenant_id: TENANT_A, name: 'Main LLC', is_default: true, active: true },
      { id: 'ent-other', tenant_id: TENANT_A, name: 'Side LLC', is_default: false, active: true },
    ],
  })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT_A }, error: null }),
}))

vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT_A }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PATCH } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase
const patchReq = (body: unknown) => new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })

describe('PATCH /api/finance/entities/[id] — default-entity deactivation guard', () => {
  it('rejects {active: false} on the default entity (400), row stays active', async () => {
    const res = await PATCH(patchReq({ active: false }), { params: Promise.resolve({ id: 'ent-default' }) })
    expect(res.status).toBe(400)
    const row = fake._all('entities').find(r => r.id === 'ent-default')
    expect(row?.active).toBe(true)
  })

  it('CONTROL: {active: false} on a non-default entity still succeeds', async () => {
    const res = await PATCH(patchReq({ active: false }), { params: Promise.resolve({ id: 'ent-other' }) })
    expect(res.status).toBe(200)
    const row = fake._all('entities').find(r => r.id === 'ent-other')
    expect(row?.active).toBe(false)
  })
})
