import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Owner-only role escalation gate — admin/users/[id]/route.ts PUT.
 * Same gap as the sibling admin/users/route.ts write paths: 'settings.edit'
 * alone (held by admin too) let an admin grant 'owner' to anyone or demote
 * the real owner. Proves an admin caller is rejected and the member's role
 * is left unchanged; an owner caller succeeds.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentRole: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT_ID, role: currentRole },
    error: null,
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { PUT } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function putReq(id: string, body: unknown) {
  const req = new NextRequest(`http://x/api/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  return { req, params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenant_members', [
    { id: 'member-staff', tenant_id: TENANT_ID, name: 'Staffer', role: 'staff' },
    { id: 'member-owner', tenant_id: TENANT_ID, name: 'Owner', role: 'owner' },
  ])
})

describe('admin/users/[id] PUT — owner-only role escalation gate', () => {
  it('an admin cannot promote another member to owner', async () => {
    currentRole = 'admin'
    const { req, params } = putReq('member-staff', { role: 'owner' })
    const res = await PUT(req, { params })
    expect(res.status).toBe(403)
    const row = fake._store.get('tenant_members')?.find(r => r.id === 'member-staff')
    expect(row?.role).toBe('staff')
  })

  it('an admin cannot demote the real owner out of their role', async () => {
    currentRole = 'admin'
    const { req, params } = putReq('member-owner', { role: 'staff' })
    const res = await PUT(req, { params })
    expect(res.status).toBe(403)
    const row = fake._store.get('tenant_members')?.find(r => r.id === 'member-owner')
    expect(row?.role).toBe('owner')
  })

  it('an owner can reassign roles including owner (positive control)', async () => {
    currentRole = 'owner'
    const { req, params } = putReq('member-staff', { role: 'owner' })
    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    const row = fake._store.get('tenant_members')?.find(r => r.id === 'member-staff')
    expect(row?.role).toBe('owner')
  })
})
