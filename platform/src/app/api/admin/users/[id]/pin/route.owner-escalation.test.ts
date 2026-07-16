import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /api/admin/users/[id]/pin — owner-PIN escalation guard (sibling gap to the
 * fix already applied on ../route.ts's role field). A non-owner holding
 * settings.edit could reset the OWNER's PIN, read it back in the plaintext
 * response, and log in as the owner — a more direct account takeover than
 * the role-field bug, and previously unguarded.
 */

const h = vi.hoisted(() => ({
  tenantId: 'tenant-A',
  callerRole: 'owner',
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle & { tenantId: string; callerRole: string }

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: h.tenantId, role: h.callerRole }, error: null }),
}))
vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed-${pin}`,
  generateAdminPin: () => '1234',
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

import { POST, DELETE } from './route'

const params = (id: string) => Promise.resolve({ id })
const postReq = (body: unknown) => new NextRequest('http://x', { method: 'POST', body: JSON.stringify(body) })

beforeEach(() => {
  h.tenantId = 'tenant-A'
  h.callerRole = 'owner'
  h.seq = 0
  h.store = {
    tenant_members: [
      { id: 'm-owner', tenant_id: 'tenant-A', name: 'Owner', role: 'owner', pin_hash: 'existing-hash', pin_set_at: '2026-01-01' },
      { id: 'm-admin', tenant_id: 'tenant-A', name: 'AdminActor', role: 'admin', pin_hash: null, pin_set_at: null },
    ],
  }
})

describe('POST /api/admin/users/[id]/pin — owner PIN reset restricted to owner callers', () => {
  it('an admin-role caller cannot reset the owner PIN (403, pin_hash unchanged, no plaintext leaked)', async () => {
    h.callerRole = 'admin'
    const res = await POST(postReq({ pin: '9999' }), { params: params('m-owner') })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.pin).toBeUndefined()
    expect(h.store.tenant_members.find((m) => m.id === 'm-owner')?.pin_hash).toBe('existing-hash')
  })

  it('an owner-role caller can reset the owner PIN', async () => {
    h.callerRole = 'owner'
    const res = await POST(postReq({ pin: '9999' }), { params: params('m-owner') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-owner')?.pin_hash).toBe('hashed-9999')
  })

  it('an admin-role caller can still set a PIN on a non-owner member', async () => {
    h.callerRole = 'admin'
    const res = await POST(postReq({ pin: '9999' }), { params: params('m-admin') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-admin')?.pin_hash).toBe('hashed-9999')
  })
})

describe('DELETE /api/admin/users/[id]/pin — owner PIN clear restricted to owner callers', () => {
  it('an admin-role caller cannot clear the owner PIN (403, pin_hash survives)', async () => {
    h.callerRole = 'admin'
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: params('m-owner') })
    expect(res.status).toBe(403)
    expect(h.store.tenant_members.find((m) => m.id === 'm-owner')?.pin_hash).toBe('existing-hash')
  })

  it('an owner-role caller can clear the owner PIN', async () => {
    h.callerRole = 'owner'
    const res = await DELETE(new NextRequest('http://x', { method: 'DELETE' }), { params: params('m-owner') })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.find((m) => m.id === 'm-owner')?.pin_hash).toBeNull()
  })
})
