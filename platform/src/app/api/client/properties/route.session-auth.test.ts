/**
 * /api/client/properties's non-admin path still used lib/nycmaid/auth's legacy
 * protectClientAPI — signed with the platform-wide ADMIN_PASSWORD, no tenant
 * binding, and not even the cookie format the real login flow issues (3-part
 * legacy vs. the 4-part clientId.tenantId.ts.sig format lib/client-auth.ts
 * creates) — so a real client_session cookie from /api/client/login or
 * /api/client/verify-code never validated here at all. Meanwhile the sibling
 * /api/client/preferred-cleaner and /api/client/recurring routes were already
 * migrated to lib/client-auth's tenant-bound protectClientAPI, with a comment
 * citing THIS route as the pattern to follow — so this route was the one
 * left behind. Tests below exercise the fixed (tenant-bound) session path.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

beforeAll(() => {
  process.env.PORTAL_SECRET ||= 'test-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
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

let adminAuthed = false
vi.mock('@/lib/nycmaid/auth', () => ({
  isAdminAuthenticated: vi.fn(async () => adminAuthed),
}))

vi.mock('@/lib/client-properties', () => ({
  listProperties: vi.fn(async () => []),
  addProperty: vi.fn(async () => ({ id: 'prop-new' })),
  updateProperty: vi.fn(async () => ({ id: 'prop-1' })),
  setPrimaryProperty: vi.fn(async () => {}),
  deactivateProperty: vi.fn(async () => {}),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { createClientSession } from '@/lib/client-auth'
import { GET, POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_A = 'tenant-A'
const TENANT_B = 'tenant-B'
const OWNER_ID = 'client-owner'
const VICTIM_ID = 'client-victim'

function seed() {
  fake._store.clear()
  fake._seed('clients', [
    { id: OWNER_ID, tenant_id: TENANT_A, do_not_service: false },
    { id: VICTIM_ID, tenant_id: TENANT_A, do_not_service: false },
  ])
  currentTenantId = TENANT_A
  adminAuthed = false
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

describe('GET /api/client/properties', () => {
  it('rejects an unauthenticated read', async () => {
    noSession()
    const res = await GET(new Request(`http://x/api/client/properties?client_id=${VICTIM_ID}`))
    expect(res.status).toBe(401)
  })

  it("rejects a valid session for a DIFFERENT client (IDOR)", async () => {
    withSession(OWNER_ID)
    const res = await GET(new Request(`http://x/api/client/properties?client_id=${VICTIM_ID}`))
    expect(res.status).toBe(403)
  })

  it("rejects a session minted for a DIFFERENT tenant, even for the same client id", async () => {
    withSession(OWNER_ID, TENANT_B)
    const res = await GET(new Request(`http://x/api/client/properties?client_id=${OWNER_ID}`))
    expect(res.status).toBe(401)
  })

  it('allows a client to read their own properties', async () => {
    withSession(OWNER_ID)
    const res = await GET(new Request(`http://x/api/client/properties?client_id=${OWNER_ID}`))
    expect(res.status).toBe(200)
  })

  it('allows a legacy admin session to bypass the client-session check', async () => {
    adminAuthed = true
    noSession()
    const res = await GET(new Request(`http://x/api/client/properties?client_id=${OWNER_ID}`))
    expect(res.status).toBe(200)
  })
})

describe('POST /api/client/properties', () => {
  it("blocks an unauthenticated caller from adding a property to another client", async () => {
    noSession()
    const req = new Request('http://x/api/client/properties', {
      method: 'POST',
      body: JSON.stringify({ client_id: VICTIM_ID, address: '123 Main St, Springfield' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it("blocks a DIFFERENT client's session from adding a property to the victim", async () => {
    withSession(OWNER_ID)
    const req = new Request('http://x/api/client/properties', {
      method: 'POST',
      body: JSON.stringify({ client_id: VICTIM_ID, address: '123 Main St, Springfield' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('allows a client to add their own property', async () => {
    withSession(OWNER_ID)
    const req = new Request('http://x/api/client/properties', {
      method: 'POST',
      body: JSON.stringify({ client_id: OWNER_ID, address: '123 Main St, Springfield' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })
})
