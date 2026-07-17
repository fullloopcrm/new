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
const fake = supabaseAdmin as unknown as FakeSupabase

beforeEach(() => {
  fake._store.clear()
  currentTenantId = A_ID
  fake._seed('client_reviews', [
    { id: 'cr-a', tenant_id: A_ID, client_id: 'c-1', type: 'text', credit_amount: 10, status: 'pending', created_at: '2026-07-01T00:00:00Z' },
    { id: 'cr-b', tenant_id: B_ID, client_id: 'c-2', type: 'text', credit_amount: 10, status: 'pending', created_at: '2026-07-02T00:00:00Z' },
  ])
})

describe('GET /api/client-reviews', () => {
  it("only returns the requesting tenant's own review credits", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.credits).toHaveLength(1)
    expect(body.credits[0].id).toBe('cr-a')
  })
})
