import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Auth gate probe — team/route.ts GET.
 * The route used getTenantForRequest() with no requirePermission check, while
 * its own POST/PUT/DELETE siblings (and the dashboard/hr GET sibling) already
 * gate on team.view/team.create/team.edit/team.delete. select('*') on
 * team_members returns each member's PIN (the credential used to log into
 * /team-portal), pay_rate, hourly_rate, phone, and address — so any
 * authenticated tenant member of ANY role, even one whose tenant explicitly
 * revoked team.view via the RBAC override, could enumerate every coworker's
 * portal PIN and hijack their team-portal session, plus read payroll data.
 * Fixed by requiring requirePermission('team.view'), matching the sibling
 * gates and honoring the tenant's own RBAC customization.
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
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('team_members', [
    { id: 'tm-1', tenant_id: TENANT_ID, name: 'Alice', pin: '1234', pay_rate: 25, created_at: '2026-01-01T00:00:00Z' },
  ])
})

describe('team GET — permission gate', () => {
  it('a caller with team.view sees the roster (positive control)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.team)).toBe(true)
    expect(body.team[0].pin).toBe('1234')
  })

  it('an unauthenticated / team.view-lacking caller is rejected and gets no roster/PIN data', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.team).toBeUndefined()
  })
})
