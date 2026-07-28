/**
 * Characterization tests for finance/cpa-tokens GET + DELETE — the two
 * handlers left uncovered by route.expiry.test.ts (POST expires_in_days=0
 * witness) and route.witness.test.ts (POST cross-tenant entity_id witness).
 * These tokens grant read access into a tenant's full general ledger, so
 * "who can list/revoke them, scoped to which tenant" is a real access
 * control surface, not just plumbing.
 *
 * Pins:
 *   - GET excludes revoked tokens (is revoked_at null) and returns the
 *     embedded entities(name) relation verbatim
 *   - DELETE sets revoked_at, tenant-scoped: a foreign token id is never
 *     revoked (the update's own .eq('tenant_id', tenantId) matches nothing)
 *   - both short-circuit on an auth failure
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const requirePermissionMock = vi.hoisted(() =>
  vi.fn(async () => ({ tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' }, error: null })),
)
vi.mock('@/lib/require-permission', () => ({ requirePermission: requirePermissionMock }))

import { GET, DELETE } from './route'

let h: Harness
beforeEach(() => {
  requirePermissionMock.mockImplementation(async () => ({
    tenant: { userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' },
    error: null,
  }))
  h = createTenantDbHarness({ cpa_access_tokens: [] })
  holder.from = h.from
})

function deleteReq(body: unknown): Request {
  return new Request('http://t', { method: 'DELETE', body: JSON.stringify(body) })
}

describe('GET /api/finance/cpa-tokens', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await GET()
    expect(res.status).toBe(403)
  })

  it('lists live tokens with the embedded entity name, excludes revoked ones', async () => {
    h.seed.cpa_access_tokens.push(
      { id: 't-live', tenant_id: CTX_TENANT, cpa_name: 'Alice CPA', revoked_at: null, entities: { name: 'Main LLC' } },
      { id: 't-revoked', tenant_id: CTX_TENANT, cpa_name: 'Bob CPA', revoked_at: '2026-01-01T00:00:00Z', entities: null },
    )
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tokens).toHaveLength(1)
    expect(body.tokens[0]).toMatchObject({ id: 't-live', entities: { name: 'Main LLC' } })
  })

  it('never returns another tenant\'s tokens', async () => {
    h.seed.cpa_access_tokens.push({ id: 't-foreign', tenant_id: OTHER_TENANT, revoked_at: null })
    const res = await GET()
    const body = await res.json()
    expect(body.tokens).toHaveLength(0)
  })

  it('returns an empty list, not an error, when there are no tokens', async () => {
    const res = await GET()
    const body = await res.json()
    expect(body).toEqual({ tokens: [] })
  })
})

describe('DELETE /api/finance/cpa-tokens', () => {
  it('short-circuits on an auth failure', async () => {
    const authError = new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 })
    requirePermissionMock.mockImplementationOnce(async () => ({ tenant: null, error: authError }))
    const res = await DELETE(deleteReq({ id: 't-1' }))
    expect(res.status).toBe(403)
  })

  it('revokes a token belonging to the caller\'s tenant', async () => {
    h.seed.cpa_access_tokens.push({ id: 't-1', tenant_id: CTX_TENANT, revoked_at: null })
    const res = await DELETE(deleteReq({ id: 't-1' }))
    expect(res.status).toBe(200)
    expect((await res.json()).ok).toBe(true)
    const row = h.seed.cpa_access_tokens.find((t) => t.id === 't-1')!
    expect(row.revoked_at).toBeTruthy()
  })

  it('never revokes a token belonging to another tenant', async () => {
    h.seed.cpa_access_tokens.push({ id: 't-foreign', tenant_id: OTHER_TENANT, revoked_at: null })
    const res = await DELETE(deleteReq({ id: 't-foreign' }))
    expect(res.status).toBe(200) // update on 0 matched rows is still a "success" no-op, same as real Supabase
    const row = h.seed.cpa_access_tokens.find((t) => t.id === 't-foreign')!
    expect(row.revoked_at).toBeNull()
  })
})
