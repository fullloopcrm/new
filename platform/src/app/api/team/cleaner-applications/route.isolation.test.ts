import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team/cleaner-applications/route.ts.
 * Proves tenant A's GET never sees tenant B's cleaner_applications rows,
 * and that the permission gate rejects a caller without team.view.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
let currentTenantId: string
let permissionError: unknown = null

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_A
  permissionError = null
  fake._seed('cleaner_applications', [
    { id: 'app-a', tenant_id: TENANT_A, name: 'Alice A', status: 'pending', created_at: '2026-07-01' },
    { id: 'app-b', tenant_id: TENANT_B, name: 'Bob B', status: 'pending', created_at: '2026-07-02' },
  ])
})

describe('GET /api/team/cleaner-applications — tenantDb isolation', () => {
  it("never returns another tenant's applications", async () => {
    const res = await GET()
    const body = await res.json()
    const ids = body.applications.map((a: { id: string }) => a.id)
    expect(ids).toContain('app-a')
    expect(ids).not.toContain('app-b')
  })

  it('rejects a caller without team.view', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await GET()
    expect(res.status).toBe(403)
  })
})
