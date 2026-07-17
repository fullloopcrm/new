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
 *
 * Follow-on: the first fix checked `updates.active === false` against the
 * row's *pre-update* is_default, then applied `make_default` in the same
 * write — so {active: false, make_default: true} in one request slipped
 * through (is_default was still false when the guard ran) and landed an
 * inactive default entity. A second path bypassed it entirely: {make_default:
 * true} alone on an already-inactive entity never touched `updates.active`,
 * so the guard never fired at all. Fixed by checking the merged final state
 * (willBeDefault && !willBeActive) instead of the two fields in isolation.
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
      { id: 'ent-other2', tenant_id: TENANT_A, name: 'Third LLC', is_default: false, active: true },
      { id: 'ent-inactive', tenant_id: TENANT_A, name: 'Dormant LLC', is_default: false, active: false },
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

  it('rejects {active: false, make_default: true} combined in one request', async () => {
    const res = await PATCH(patchReq({ active: false, make_default: true }), { params: Promise.resolve({ id: 'ent-other2' }) })
    expect(res.status).toBe(400)
    const row = fake._all('entities').find(r => r.id === 'ent-other2')
    expect(row?.active).toBe(true)
    expect(row?.is_default).toBe(false)
    // the original default entity must still be untouched/default
    const original = fake._all('entities').find(r => r.id === 'ent-default')
    expect(original?.is_default).toBe(true)
  })

  it('rejects {make_default: true} alone on an already-inactive entity', async () => {
    // ent-inactive starts active:false, is_default:false
    const res = await PATCH(patchReq({ make_default: true }), { params: Promise.resolve({ id: 'ent-inactive' }) })
    expect(res.status).toBe(400)
    const row = fake._all('entities').find(r => r.id === 'ent-inactive')
    expect(row?.is_default).toBe(false)
    const original = fake._all('entities').find(r => r.id === 'ent-default')
    expect(original?.is_default).toBe(true)
  })
})
