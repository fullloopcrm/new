import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — admin/schedule-issues GET.
 * GET previously only checked getTenantForRequest() (any authenticated
 * tenant member), while its sibling PUT on the same file already required
 * schedules.edit — an inconsistency that let a role with schedules.view
 * revoked via tenant override still read schedule_issues.
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

function req(): Request {
  return new Request('http://x/api/admin/schedule-issues')
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
  permissionError = null
  fake._seed('schedule_issues', [
    { id: 'si-1', tenant_id: TENANT_ID, status: 'open', severity: 1, created_at: '2026-01-01' },
  ])
})

describe('admin/schedule-issues GET — permission gate', () => {
  it('a caller with schedules.view can list schedule issues (positive control)', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.length).toBe(1)
  })

  it('a role lacking schedules.view is forbidden', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET(req())
    expect(res.status).toBe(403)
  })
})
