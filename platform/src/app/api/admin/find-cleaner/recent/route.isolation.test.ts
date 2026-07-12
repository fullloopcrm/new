import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — /api/admin/find-cleaner/recent (converted to tenantDb).
 *
 * GET-only reader over two tenant-scoped tables: `cleaner_broadcasts` (recent
 * 10) and `cleaner_broadcast_recipients` (fanned out by the broadcast ids from
 * the first, tenant-scoped, query). The conversion swaps both
 * `supabaseAdmin.from(…).eq('tenant_id', …)` calls for tenantDb's injected
 * filter. No by-id caller input (ids are derived from the tenant's own
 * broadcasts, not the request) → no IDOR surface.
 *
 * Two probes:
 *  1. a foreign tenant's broadcast never appears in the list;
 *  2. a FORGED foreign-tenant recipient row that points at THIS tenant's
 *     broadcast_id is still excluded — proving the recipients read is
 *     tenant-scoped, not merely filtered by the derived id list.
 */

const A = 'tid-a'
const B = 'tid-b'

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
    getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
  }
})

import { GET } from './route'

function seed() {
  return {
    cleaner_broadcasts: [
      { id: 'bc-a1', tenant_id: A, sent_at: '2026-07-10T00:00:00Z' },
      { id: 'bc-b1', tenant_id: B, sent_at: '2026-07-11T00:00:00Z' },
    ],
    cleaner_broadcast_recipients: [
      { id: 'rec-a1', tenant_id: A, broadcast_id: 'bc-a1', cleaner_id: 'cl-a', phone: '+1a', sent_at: null, replied_at: null, reply_text: null, status: 'sent' },
      // Forged: belongs to tenant B but points at tenant A's broadcast id.
      { id: 'rec-b-forge', tenant_id: B, broadcast_id: 'bc-a1', cleaner_id: 'cl-b', phone: '+1b', sent_at: null, replied_at: null, reply_text: null, status: 'sent' },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/find-cleaner/recent — tenant isolation', () => {
  it("GET excludes a foreign tenant's broadcasts and forged recipients", async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    const broadcasts = body.broadcasts as Array<{ id: string; recipients: Array<{ id: string }> }>
    expect(broadcasts.map((b) => b.id)).toEqual(['bc-a1'])

    const recIds = broadcasts[0].recipients.map((r) => r.id)
    expect(recIds).toEqual(['rec-a1'])
    expect(recIds).not.toContain('rec-b-forge')
  })
})
