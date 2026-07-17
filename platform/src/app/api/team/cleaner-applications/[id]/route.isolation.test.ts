import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * tenantDb conversion probe — team/cleaner-applications/[id]/route.ts.
 * Proves tenant A's PATCH can only accept/reject its OWN application, never
 * a same-id row belonging to tenant B; that an invalid action is rejected
 * before any DB write; and that accept delegates to the shared
 * provisionApprovedApplicant helper (mocked here — its own behavior, incl.
 * PIN generation, is that helper's responsibility, not this route's).
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const provisionMock = vi.fn(async (_tenantId: string, _app: unknown) => {})
vi.mock('@/lib/team-provisioning', () => ({
  provisionApprovedApplicant: (tenantId: string, app: unknown) => provisionMock(tenantId, app),
}))

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
import { PATCH } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const SHARED_ID = 'app-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

function patchReq(body: Record<string, unknown>) {
  return new Request('http://x', { method: 'PATCH', body: JSON.stringify(body) })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  permissionError = null
  provisionMock.mockClear()
  fake._seed('cleaner_applications', [
    { id: SHARED_ID, tenant_id: A_ID, name: 'Alice A', phone: '555-0001', status: 'pending', notes: null },
    { id: SHARED_ID, tenant_id: B_ID, name: 'Bob B', phone: '555-0002', status: 'pending', notes: null },
  ])
})

describe('PATCH /api/team/cleaner-applications/[id] — tenantDb isolation', () => {
  it('accepts tenant A\'s OWN application (positive control), provisioning via the shared helper', async () => {
    const res = await PATCH(patchReq({ action: 'accept' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.application.tenant_id).toBe(A_ID)
    expect(body.application.status).toBe('accepted')
    expect(body.application.reviewed_at).toBeTruthy()
    expect(provisionMock).toHaveBeenCalledTimes(1)
    expect(provisionMock).toHaveBeenCalledWith(A_ID, expect.objectContaining({ id: SHARED_ID, name: 'Alice A' }))
  })

  it("tenant A's accept never mutates tenant B's same-id row", async () => {
    await PATCH(patchReq({ action: 'accept' }), paramsFor(SHARED_ID))
    const bApp = fake._all('cleaner_applications').find((r) => r.tenant_id === B_ID)!
    expect(bApp.status).toBe('pending')
  })

  it('rejects an application with a reason appended to notes', async () => {
    const res = await PATCH(patchReq({ action: 'reject', reason: 'no coverage in zone' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.application.status).toBe('rejected')
    expect(body.application.notes).toMatch(/no coverage in zone/)
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('marks an application reviewed without accepting or rejecting it', async () => {
    const res = await PATCH(patchReq({ action: 'mark_reviewed' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.application.status).toBe('reviewed')
    expect(body.application.reviewed_at).toBeTruthy()
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('rejects an unrecognized action before touching the database', async () => {
    const res = await PATCH(patchReq({ action: 'delete' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(400)
    const aApp = fake._all('cleaner_applications').find((r) => r.tenant_id === A_ID)!
    expect(aApp.status).toBe('pending')
    expect(provisionMock).not.toHaveBeenCalled()
  })

  it('rejects a caller without team.edit', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await PATCH(patchReq({ action: 'accept' }), paramsFor(SHARED_ID))
    expect(res.status).toBe(403)
  })
})
