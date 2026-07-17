import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
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

import { supabaseAdmin } from '@/lib/supabase'
import { GET } from './route'

const A_ID = 'tenant-A'
const B_ID = 'tenant-B'
const MEMBER_ID = 'tm-shared'
const fake = supabaseAdmin as unknown as FakeSupabase

function paramsFor(id: string): { params: Promise<{ id: string }> } {
  return { params: Promise.resolve({ id }) }
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('team_members', [
    { id: MEMBER_ID, tenant_id: A_ID, name: 'Alice A' },
    { id: MEMBER_ID, tenant_id: B_ID, name: 'Bob B' },
  ])
  fake._seed('ratings', [
    { id: 'r-a', tenant_id: A_ID, team_member_id: MEMBER_ID, service_rating: 5, feedback: null, created_at: '2026-07-01T00:00:00Z' },
    { id: 'r-b', tenant_id: B_ID, team_member_id: MEMBER_ID, service_rating: 2, feedback: 'left early', created_at: '2026-07-02T00:00:00Z' },
  ])
})

describe('GET /api/team/[id]/ratings', () => {
  it("only returns the requesting tenant's own ratings for a same-id member", async () => {
    const res = await GET(new Request('http://x'), paramsFor(MEMBER_ID))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ratings).toHaveLength(1)
    expect(body.ratings[0].id).toBe('r-a')
  })

  it('404s when the member id does not belong to this tenant', async () => {
    currentTenantId = 'tenant-C'
    const res = await GET(new Request('http://x'), paramsFor(MEMBER_ID))
    expect(res.status).toBe(404)
  })
})
