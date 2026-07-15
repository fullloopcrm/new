import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/dashboard/messages marks every admin->owner message read as a
 * side effect of loading the thread. Same forged-cross-site-GET risk as
 * notifications (SameSite=Lax cookies ride along on top-level navigation) —
 * see route.ts and csrf-guard.ts. Proves the write is skipped cross-site and
 * still runs same-origin.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/tenant-query', () => {
  class AuthError extends Error {
    status: number
    constructor(message: string, status: number) {
      super(message)
      this.status = status
    }
  }
  return {
    AuthError,
    getTenantForRequest: vi.fn(async () => ({ tenantId: CTX_TENANT, tenant: { id: CTX_TENANT } })),
  }
})

import { GET } from './route'

function seed() {
  return {
    tenant_owner_messages: [
      { id: 'm-1', tenant_id: CTX_TENANT, direction: 'out', channel: 'platform', body: 'hi', sender: 'jeff', sender_role: 'admin', read_at: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(secFetchSite: string | null) {
  return {
    headers: { get: (name: string) => (name.toLowerCase() === 'sec-fetch-site' ? secFetchSite : null) },
  } as unknown as import('next/server').NextRequest
}

describe('dashboard/messages GET — cross-site mark-read guard', () => {
  it('skips the mark-read write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(req('cross-site'))
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'tenant_owner_messages')).toBe(false)
  })

  it('CONTROL: still marks read for a same-origin request', async () => {
    const res = await GET(req('same-origin'))
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'tenant_owner_messages')).toBe(true)
  })

  it('CONTROL: still marks read when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(req(null))
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'tenant_owner_messages')).toBe(true)
  })
})
