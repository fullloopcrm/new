import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Ownership isolation for GET/POST/PATCH /api/portal/properties — a portal
 * token can only ever list/add/edit properties belonging to ITS OWN client,
 * confirmed via requireOwnClient() (mirrors admin's verifyOwnership()) before
 * delegating to the shared client-properties.ts lib.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentAuth: { id: string; tid: string } | null
vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => currentAuth,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST, PATCH } from './route'

const TENANT_A = 'tenant-A'
const CLIENT_A = 'client-a'
const CLIENT_B = 'client-b' // exists, but NOT under this token's tenant/auth
const fake = supabaseAdmin as unknown as FakeSupabase

function req(method: string, body?: unknown): Request {
  return new Request('http://x/api/portal/properties', {
    method,
    headers: { authorization: 'Bearer whatever' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  fake._store.clear()
  currentAuth = { id: CLIENT_A, tid: TENANT_A }
  fake._seed('clients', [
    { id: CLIENT_A, tenant_id: TENANT_A, address: null },
    { id: CLIENT_B, tenant_id: TENANT_A, address: null },
  ])
  fake._seed('client_properties', [
    { id: 'prop-a', tenant_id: TENANT_A, client_id: CLIENT_A, address: '1 Own St', unit: null, is_primary: true, active: true, created_at: '2026-01-01' },
    { id: 'prop-b', tenant_id: TENANT_A, client_id: CLIENT_B, address: '2 Other St', unit: null, is_primary: false, active: true, created_at: '2026-01-01' },
  ])
})

describe('GET /api/portal/properties — isolation', () => {
  it('returns only this client’s own properties', async () => {
    const res = await GET(req('GET') as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    const ids = (body.properties as Array<{ id: string }>).map((p: { id: string }) => p.id)
    expect(ids).toEqual(['prop-a'])
  })
})

describe('POST /api/portal/properties — isolation', () => {
  it('adds the new address under the AUTHENTICATED client, ignoring any caller-supplied client_id', async () => {
    const res = await POST(req('POST', { address: '123 New Address Ave', client_id: CLIENT_B }) as never)
    expect(res.status).toBe(200)
    const created = fake._all('client_properties').find((r) => r.address === '123 New Address Ave')
    expect(created?.client_id).toBe(CLIENT_A)
  })
})

describe('PATCH /api/portal/properties — isolation', () => {
  it('cannot set_primary on a property belonging to a different client', async () => {
    await PATCH(req('PATCH', { property_id: 'prop-b', action: 'set_primary' }) as never)
    const propB = fake._all('client_properties').find((r) => r.id === 'prop-b')
    // The lib's set-true step is scoped by .eq('client_id', clientId) — since
    // prop-b belongs to CLIENT_B, client A's call must never flip it to true.
    expect(propB?.client_id).toBe(CLIENT_B)
    expect(propB?.is_primary).toBe(false)
  })

  it('updates an address that genuinely belongs to the authenticated client', async () => {
    const res = await PATCH(req('PATCH', { property_id: 'prop-a', address: '99 Updated Ave' }) as never)
    expect(res.status).toBe(200)
    const propA = fake._all('client_properties').find((r) => r.id === 'prop-a')
    expect(propA?.address).toBe('99 Updated Ave')
  })
})
