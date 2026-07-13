import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/notifications?mark_read=true flips every admin notification's
 * `metadata.read` to true. Because this is a GET, a SameSite=Lax session
 * cookie is still attached on a cross-site top-level navigation (that's the
 * whole point of "Lax" vs "Strict") — so a forged link to this URL runs
 * authenticated and silently clears the unread badge. This proves the guard:
 * the write is skipped when Sec-Fetch-Site says the request is cross-site,
 * and still runs for a normal same-origin/absent-header request.
 */

const CTX_TENANT = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/notify', () => ({ notify: vi.fn(async () => undefined) }))
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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: CTX_TENANT, tenant: { id: CTX_TENANT }, role: 'owner' })),
  }
})

import { GET } from './route'

function seed() {
  return {
    notifications: [
      { id: 'n-1', tenant_id: CTX_TENANT, recipient_type: 'admin', message: 'hi', metadata: null },
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
    nextUrl: { searchParams: new URLSearchParams({ mark_read: 'true' }) },
    headers: { get: (name: string) => (name.toLowerCase() === 'sec-fetch-site' ? secFetchSite : null) },
  } as unknown as import('next/server').NextRequest
}

describe('notifications GET — cross-site mark_read guard', () => {
  it('skips the mark-read write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(req('cross-site'))
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'notifications')).toBe(false)
  })

  it('CONTROL: still marks read for a same-origin request', async () => {
    const res = await GET(req('same-origin'))
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'notifications')).toBe(true)
  })

  it('CONTROL: still marks read when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(req(null))
    expect(res.status).toBe(200)
    expect(h.capture.updates.some((u) => u.table === 'notifications')).toBe(true)
  })
})
