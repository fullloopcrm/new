import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Auth gate + field-exposure probe — team/route.ts GET.
 *
 * Auth gate: the route previously used getTenantForRequest() with no
 * requirePermission check, while its own POST/PUT/DELETE siblings (and the
 * dashboard/hr GET sibling) already gate on
 * team.view/team.create/team.edit/team.delete. Fixed by requiring
 * requirePermission('team.view'), matching the sibling gates.
 *
 * Field exposure (this round): select('*') on team_members returned every
 * member's PIN (the credential used to log into /team-portal), pay_rate,
 * notes, and tax_ssn_last4/tax_address to ANY team.view holder — including
 * 'staff', the lowest role, which cannot even edit team members. This list
 * endpoint now selects an explicit column allowlist that never includes
 * those fields, for any role (the single-record GET at team/[id]/route.ts
 * conditionally restores them for team.edit holders).
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
  // Note: FakeSupabase's select() intentionally ignores its column-list argument
  // (see src/test/fake-supabase.ts) — it always returns the full seeded row, so
  // it cannot verify column projection. The field-exposure fix (pin/pay_rate/
  // notes/tax_* dropped from this route's select list) is instead covered by
  // the static source-level assertions in route.field-exposure.test.ts.
  it('a caller with team.view sees the roster (positive control)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.team)).toBe(true)
    expect(body.team[0].name).toBe('Alice')
  })

  it('an unauthenticated / team.view-lacking caller is rejected and gets no roster/PIN data', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.team).toBeUndefined()
  })
})
