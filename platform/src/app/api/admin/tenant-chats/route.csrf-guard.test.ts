import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/admin/tenant-chats?tenant_id=... marks inbound owner messages read
 * as a side effect of loading a thread. Gated by requireAdmin() (admin_token,
 * SameSite=Lax), so the same forged-cross-site-GET risk applies — see route.ts
 * and csrf-guard.ts. Proves the write is skipped cross-site and still runs
 * same-origin.
 */

const TENANT_ID = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn(async () => null) }))

import { GET } from './route'

function seed() {
  return {
    tenant_owner_messages: [
      { id: 'm-1', tenant_id: TENANT_ID, direction: 'in', channel: 'platform', body: 'hi', sender: 'owner', read_at: null },
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
    nextUrl: { searchParams: new URLSearchParams({ tenant_id: TENANT_ID }) },
    headers: { get: (name: string) => (name.toLowerCase() === 'sec-fetch-site' ? secFetchSite : null) },
  } as unknown as import('next/server').NextRequest
}

describe('admin/tenant-chats GET — cross-site mark-read guard', () => {
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
