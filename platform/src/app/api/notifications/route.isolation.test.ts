import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/notifications (converted to tenantDb).
 *
 * Both the list SELECT and the unread COUNT run through tenantDb, so a foreign
 * tenant's notification must be absent from the list AND uncounted.
 */

const CTX_TENANT = 'tid-a'
const OTHER_TENANT = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({
      userId: 'u1',
      tenantId: CTX_TENANT,
      tenant: { id: CTX_TENANT },
      role: 'owner',
    })),
  }
})

import { GET } from './route'

function seed() {
  return {
    notifications: [
      { id: 'n-a1', tenant_id: CTX_TENANT, recipient_type: 'admin', message: 'mine', metadata: null },
      { id: 'n-a2', tenant_id: CTX_TENANT, recipient_type: 'admin', message: 'mine2', metadata: null },
      { id: 'n-b1', tenant_id: OTHER_TENANT, recipient_type: 'admin', message: 'theirs', metadata: null },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req() {
  return { nextUrl: { searchParams: new URLSearchParams() } } as unknown as import('next/server').NextRequest
}

describe('notifications GET — tenant isolation', () => {
  it('wrong-tenant probe: list and unread count exclude the foreign tenant\'s notification', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()

    const ids = body.notifications.map((n: { id: string }) => n.id)
    expect(ids).toEqual(expect.arrayContaining(['n-a1', 'n-a2']))
    expect(ids).not.toContain('n-b1')
    // Unread count is scoped too — the foreign unread row must not inflate it.
    expect(body.unread).toBe(2)
  })
})
