import { NextResponse } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

/**
 * requirePermission gate probe — import-clients/route.ts.
 * This is a second, undocumented bulk-client-insert endpoint alongside the
 * properly-gated /api/clients/import (requirePermission('clients.create')).
 * This one called getTenantForRequest() directly with zero permission check —
 * any authenticated tenant role, including 'staff' (which rbac.ts grants only
 * clients.view, not clients.create), could bulk-insert client rows with
 * attacker-chosen PINs. Proves it now requires clients.create and never
 * inserts when denied.
 */

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

let currentTenantId: string
let permissionError: unknown = null
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
  requirePermission: async () => (
    permissionError
      ? { tenant: null, error: permissionError }
      : { tenant: { tenantId: currentTenantId }, error: null }
  ),
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
  permissionError = null
})

describe('import-clients POST — permission gate', () => {
  it('a caller with clients.create imports clients (positive control)', async () => {
    const res = await POST(req([{ name: 'Jane Doe' }]))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(1)
    expect(fake._all('clients').length).toBe(1)
  })

  it('a role lacking clients.create is forbidden and never inserts any client', async () => {
    permissionError = NextResponse.json({ error: 'Forbidden: insufficient permissions' }, { status: 403 })
    const res = await POST(req([{ name: 'Jane Doe' }]))
    expect(res.status).toBe(403)
    expect(fake._all('clients').length).toBe(0)
  })
})
