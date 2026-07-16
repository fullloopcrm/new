import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * Import-size cap probe — import-clients/route.ts.
 * Unlike its sibling /api/clients/import (5000-row cap, batched inserts),
 * this route had NO upper bound on the clients array: an authenticated
 * clients.create caller could submit an arbitrarily large payload and drive
 * an unbounded number of sequential single-row inserts in one request.
 * Proves the route now rejects an over-cap request before inserting anything,
 * and still accepts an at-cap request.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: currentTenantId }),
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) {
      super(message)
      this.status = status
    }
  },
}))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: currentTenantId }, error: null }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const TENANT_ID = 'tenant-A'
const fake = supabaseAdmin as unknown as FakeSupabase

function req(clients: Array<{ name: string }>): Request {
  return new Request('http://x', {
    method: 'POST',
    body: JSON.stringify({ clients }),
  })
}

beforeEach(() => {
  fake._store.clear()
  currentTenantId = TENANT_ID
})

describe('import-clients POST — import size cap', () => {
  it('rejects an over-cap payload before inserting any row', async () => {
    const clients = Array.from({ length: 5001 }, (_, i) => ({ name: `Client ${i}` }))
    const res = await POST(req(clients))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Maximum 5,000/)
    expect(fake._all('clients').length).toBe(0)
  })

  it('accepts a payload exactly at the cap', async () => {
    const clients = Array.from({ length: 5000 }, (_, i) => ({ name: `Client ${i}` }))
    const res = await POST(req(clients))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(5000)
  }, 20000)
})
