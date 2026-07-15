import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Owner-only role escalation gate — admin/users/route.ts (POST create, PUT update).
 * Both write paths only required 'settings.edit', which admin holds too — an
 * admin (not just the owner) could grant themselves/anyone the 'owner' role,
 * or reassign the existing owner down to a lesser role, with no owner-only
 * check. Fixed by requiring tenant.role === 'owner' whenever the write touches
 * 'owner' in either direction. Proves an admin caller is rejected and the
 * member's role is left unchanged; an owner caller succeeds.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hashed-${pin}`,
  generateAdminPin: () => '123456',
}))

let currentRole: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({
    tenant: { tenantId: TENANT_ID, role: currentRole },
    error: null,
  }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST, PUT } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://x/api/admin/users', { method: 'POST', body: JSON.stringify(body) })
}

function putReq(body: unknown): NextRequest {
  return new NextRequest('http://x/api/admin/users', { method: 'PUT', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenant_members', [
    { id: 'member-staff', tenant_id: TENANT_ID, name: 'Staffer', role: 'staff' },
    { id: 'member-owner', tenant_id: TENANT_ID, name: 'Owner', role: 'owner' },
  ])
})

describe('admin/users POST — owner-only role escalation gate', () => {
  it('an admin cannot create a new member with role=owner', async () => {
    currentRole = 'admin'
    const res = await POST(postReq({ name: 'Attacker', role: 'owner' }))
    expect(res.status).toBe(403)
    const created = fake._store.get('tenant_members')?.find(r => r.name === 'Attacker')
    expect(created).toBeUndefined()
  })

  it('an owner can create a new member with role=owner (positive control)', async () => {
    currentRole = 'owner'
    const res = await POST(postReq({ name: 'New Owner', role: 'owner' }))
    expect(res.status).toBe(200)
    const created = fake._store.get('tenant_members')?.find(r => r.name === 'New Owner')
    expect(created?.role).toBe('owner')
  })
})

describe('admin/users PUT — owner-only role escalation gate', () => {
  it('an admin cannot self-promote/promote another member to owner', async () => {
    currentRole = 'admin'
    const res = await PUT(putReq({ id: 'member-staff', role: 'owner' }))
    expect(res.status).toBe(403)
    const row = fake._store.get('tenant_members')?.find(r => r.id === 'member-staff')
    expect(row?.role).toBe('staff')
  })

  it('an admin cannot demote the real owner out of their role', async () => {
    currentRole = 'admin'
    const res = await PUT(putReq({ id: 'member-owner', role: 'staff' }))
    expect(res.status).toBe(403)
    const row = fake._store.get('tenant_members')?.find(r => r.id === 'member-owner')
    expect(row?.role).toBe('owner')
  })

  it('an owner can reassign roles including owner (positive control)', async () => {
    currentRole = 'owner'
    const res = await PUT(putReq({ id: 'member-staff', role: 'owner' }))
    expect(res.status).toBe(200)
    const row = fake._store.get('tenant_members')?.find(r => r.id === 'member-staff')
    expect(row?.role).toBe('owner')
  })
})
