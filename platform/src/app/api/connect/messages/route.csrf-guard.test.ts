import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/connect/messages upserts a read cursor as a side effect of
 * loading a channel's messages. Same forged-cross-site-GET risk as
 * notifications/dashboard-messages (SameSite=Lax cookies ride along on
 * top-level navigation) — see route.ts and csrf-guard.ts. Proves the cursor
 * write is skipped cross-site and still runs same-origin.
 */

const CTX_TENANT = 'tid-a'
const CHANNEL_ID = 'chan-1'

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
    getTenantForRequest: vi.fn(async () => ({ tenantId: CTX_TENANT, userId: 'u1', tenant: { id: CTX_TENANT } })),
  }
})

import { GET } from './route'

function seed() {
  return {
    connect_channels: [{ id: CHANNEL_ID, tenant_id: CTX_TENANT }],
    connect_messages: [{ id: 'msg-1', channel_id: CHANNEL_ID, sender_type: 'owner', sender_id: 'u1', sender_name: 'Owner', body: 'hi' }],
    connect_read_cursors: [],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function req(secFetchSite: string | null) {
  return {
    nextUrl: { searchParams: new URLSearchParams({ channel_id: CHANNEL_ID }) },
    headers: { get: (name: string) => (name.toLowerCase() === 'sec-fetch-site' ? secFetchSite : null) },
  } as unknown as import('next/server').NextRequest
}

describe('connect/messages GET — cross-site read-cursor guard', () => {
  it('skips the read-cursor write when Sec-Fetch-Site is cross-site', async () => {
    const res = await GET(req('cross-site'))
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'connect_read_cursors')).toBe(false)
  })

  it('CONTROL: still upserts the read cursor for a same-origin request', async () => {
    const res = await GET(req('same-origin'))
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'connect_read_cursors')).toBe(true)
  })

  it('CONTROL: still upserts the read cursor when Sec-Fetch-Site is absent (older client)', async () => {
    const res = await GET(req(null))
    expect(res.status).toBe(200)
    expect(h.capture.inserts.some((i) => i.table === 'connect_read_cursors')).toBe(true)
  })
})
