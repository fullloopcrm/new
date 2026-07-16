/**
 * /api/portal/messages was calling lib/nycmaid/auth's legacy protectClientAPI()
 * (platform-wide ADMIN_PASSWORD-signed, 3-part cookie, no tenant binding)
 * instead of lib/client-auth's tenant-bound version that /api/client/login and
 * /api/client/verify-code actually mint (4-part clientId.tenantId.ts.sig,
 * PORTAL_SECRET-signed) — so a real client_session cookie never validated
 * here at all. Same root cause as the /api/client/properties fix. Tests below
 * exercise the fixed (tenant-bound) session path.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

beforeAll(() => {
  process.env.PORTAL_SECRET ||= 'test-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  ;(fake as unknown as { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: null }> }).rpc =
    vi.fn(async (fn: string) => {
      if (fn === 'comhub_get_or_create_thread') return { data: THREAD_ID, error: null }
      return { data: null, error: null }
    })
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

let cookieJar = new Map<string, { value: string }>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => cookieJar.get(name),
  }),
}))

let currentTenantId: string
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => (currentTenantId ? { id: currentTenantId } : null),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
import { GET, POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const OWNER_ID = 'client-owner'
const VICTIM_ID = 'client-victim'
const THREAD_ID = 'thread-1'

function seed() {
  fake._store.clear()
  fake._seed('clients', [
    { id: OWNER_ID, tenant_id: TENANT_A, do_not_service: false, phone: '5551234567', email: null, name: 'Owner' },
    { id: VICTIM_ID, tenant_id: TENANT_A, do_not_service: false, phone: '5559876543', email: null, name: 'Victim' },
  ])
  fake._seed('comhub_contacts', [{ id: 'contact-1', tenant_id: TENANT_A, client_id: OWNER_ID }])
  fake._seed('comhub_messages', [])
  fake._seed('comhub_threads', [{ id: THREAD_ID, tenant_id: TENANT_A }])
  currentTenantId = TENANT_A
}

function withSession(clientId: string, tenantId: string = TENANT_A) {
  cookieJar = new Map([['client_session', { value: createClientSession(clientId, tenantId) }]])
}

function noSession() {
  cookieJar = new Map()
}

beforeEach(() => {
  seed()
  noSession()
})

describe('GET /api/portal/messages', () => {
  it('rejects an unauthenticated read', async () => {
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('rejects a session minted for a DIFFERENT tenant', async () => {
    withSession(OWNER_ID, TENANT_B)
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it("returns 400 when no tenant can be resolved from the request", async () => {
    currentTenantId = ''
    withSession(OWNER_ID)
    const res = await GET()
    expect(res.status).toBe(400)
  })

  it('allows a client to read their own thread', async () => {
    withSession(OWNER_ID)
    const res = await GET()
    expect(res.status).toBe(200)
  })
})

describe('POST /api/portal/messages', () => {
  it('blocks an unauthenticated caller from posting', async () => {
    const req = new Request('http://x/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'hello' }),
    })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(401)
  })

  it('allows a client to post to their own thread', async () => {
    withSession(OWNER_ID)
    const req = new Request('http://x/api/portal/messages', {
      method: 'POST',
      body: JSON.stringify({ body: 'hello' }),
    })
    const res = await POST(req as unknown as Parameters<typeof POST>[0])
    expect(res.status).toBe(200)
  })
})
