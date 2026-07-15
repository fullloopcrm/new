import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Tenant isolation — GET /api/admin/comhub/threads (converted to tenantDb).
 *
 * Admin-authed comhub inbox. The thread list is read through tenantDb
 * (`.eq('tenant_id', ctx)`), so an admin of tenant A never sees tenant B's
 * conversation threads. Probe: seed threads for both tenants and assert the
 * response contains only the caller-tenant's thread.
 */

const A = 'tid-a'
const B = 'tid-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))
vi.mock('@/lib/tenant', () => ({ getCurrentTenantId: vi.fn(async () => A) }))

import { GET } from './route'

function seed() {
  const base = { kind: 'contact', status: 'open', channel: 'sms', archived_at: null, unread_count: 0, contact_id: null, last_message_preview: 'hi' }
  return {
    comhub_threads: [
      { id: 'th-a', tenant_id: A, last_message_at: '2026-01-02T00:00:00Z', ...base },
      { id: 'th-b', tenant_id: B, last_message_at: '2026-01-01T00:00:00Z', ...base },
    ],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

describe('admin/comhub/threads GET — tenant isolation', () => {
  it("lists only the caller-tenant's threads, never another tenant's", async () => {
    const res = await GET(new NextRequest('http://t/api/admin/comhub/threads'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.threads.map((t: { id: string }) => t.id)).toEqual(['th-a'])
  })
})
