import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Auth gate probe — team/[id]/route.ts GET.
 * Same gap as the list route (route.rbac.test.ts) — getTenantForRequest()
 * with no requirePermission check, while PUT/DELETE on this same file already
 * gate on team.edit/team.delete. This handler feeds
 * dashboard/team/[id]/page.tsx, which renders member.pin directly in the UI —
 * so any authenticated tenant member, even one whose role had team.view
 * revoked via the tenant's RBAC override, could pull a single coworker's PIN
 * (team-portal login credential) plus pay_rate/address by id. Fixed by
 * requiring requirePermission('team.view').
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const TENANT_ID = 'tenant-A'
const MEMBER_ID = 'tm-1'
const fake = supabaseAdmin as unknown as FakeSupabase

function params(): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id: MEMBER_ID }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('team_members', [
    { id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Alice', pin: '1234', pay_rate: 25, created_at: '2026-01-01T00:00:00Z' },
  ])
})

describe('team/[id] GET — permission gate', () => {
  it('a caller with team.view sees the member incl. PIN (positive control)', async () => {
    const res = await GET(new Request(`http://x/api/team/${MEMBER_ID}`), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.pin).toBe('1234')
  })

  it('an unauthenticated / team.view-lacking caller is rejected and gets no member/PIN data', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET(new Request(`http://x/api/team/${MEMBER_ID}`), params())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.member).toBeUndefined()
  })
})
