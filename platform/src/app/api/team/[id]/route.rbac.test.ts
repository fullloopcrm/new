import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Auth gate + field-exposure probe — team/[id]/route.ts GET.
 *
 * Auth gate: getTenantForRequest() previously ran with no requirePermission
 * check at all, while PUT/DELETE on this same file already gate on
 * team.edit/team.delete. Fixed by requiring requirePermission('team.view').
 *
 * Field exposure (this round): team.view is held down to 'staff', the lowest
 * role, which has no team.edit and cannot set a pin (only team.edit's
 * PUT /api/cleaners/[id] can). dashboard/team/[id]/page.tsx renders
 * member.pin directly, so any staff/manager-role dashboard user — not just
 * owner/admin — could pull a coworker's live team-portal login credential,
 * plus payroll (pay_rate) and tax_ssn_last4/tax_address. Fixed by stripping
 * RESTRICTED_MEMBER_FIELDS unless the caller also holds team.edit.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
let currentRole: string
let permissionError: unknown = null
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId, role: currentRole }, error: null }
  ),
  overridesFor: () => null,
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
  currentRole = 'admin'
  permissionError = null
  fake._seed('team_members', [
    {
      id: MEMBER_ID, tenant_id: TENANT_ID, name: 'Alice', pin: '1234', pay_rate: 25,
      notes: 'confidential HR note', tax_ssn_last4: '6789', tax_address: '123 Main St',
      created_at: '2026-01-01T00:00:00Z',
    },
  ])
})

describe('team/[id] GET — permission gate', () => {
  it('an unauthenticated / team.view-lacking caller is rejected and gets no member/PIN data', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET(new Request(`http://x/api/team/${MEMBER_ID}`), params())
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.member).toBeUndefined()
  })
})

describe('team/[id] GET — restricted-field gate (pin/pay_rate/notes/tax_*)', () => {
  it('a team.edit holder (admin) sees the full member incl. PIN and payroll (positive control)', async () => {
    currentRole = 'admin'
    const res = await GET(new Request(`http://x/api/team/${MEMBER_ID}`), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.pin).toBe('1234')
    expect(body.member.pay_rate).toBe(25)
    expect(body.member.tax_ssn_last4).toBe('6789')
  })

  it('a team.view-only role (staff) does NOT get the PIN, payroll, or tax fields', async () => {
    currentRole = 'staff'
    const res = await GET(new Request(`http://x/api/team/${MEMBER_ID}`), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.pin).toBeUndefined()
    expect(body.member.pay_rate).toBeUndefined()
    expect(body.member.notes).toBeUndefined()
    expect(body.member.tax_ssn_last4).toBeUndefined()
    expect(body.member.tax_address).toBeUndefined()
    // Non-sensitive fields still come through for this role.
    expect(body.member.name).toBe('Alice')
  })

  it('a team.view-only role (manager) also does NOT get the PIN or payroll fields', async () => {
    currentRole = 'manager'
    const res = await GET(new Request(`http://x/api/team/${MEMBER_ID}`), params())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.pin).toBeUndefined()
    expect(body.member.pay_rate).toBeUndefined()
  })
})
