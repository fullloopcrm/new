import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Route-level IDOR regression for the client/* family. Proves the ownership gate
 * is actually WIRED into the routes: a forged client_id (valid session for
 * CLIENT_A, request acting on CLIENT_B) is REJECTED (403) and NO row is written.
 *
 * Mocks: next/headers (cookie), tenant-site (tenant context), supabase (records
 * every insert/update so we can assert zero writes on reject). protectClientAPI
 * runs for real against a token minted by createClientSession.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const CLIENT_A = '11111111-0000-0000-0000-000000000001'
const CLIENT_B = '22222222-0000-0000-0000-000000000002'

const mockCookie = { value: undefined as string | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (_name: string) => (mockCookie.value ? { value: mockCookie.value } : undefined),
  }),
}))

const tenantCtx: { value: { id: string } | null } = { value: { id: TENANT_A } }
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => tenantCtx.value,
}))

const writes: { inserts: Array<{ table: string }>; updates: Array<{ table: string }> } = {
  inserts: [],
  updates: [],
}
vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      insert: () => { writes.inserts.push({ table }); return c },
      update: () => { writes.updates.push({ table }); return c },
      eq: () => c,
      in: () => c,
      not: () => c,
      order: () => c,
      limit: () => c,
      single: async () => ({ data: null, error: null }),
      then: (res: (v: { data: unknown[]; error: null }) => unknown) => res({ data: [], error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

// Heavy downstream deps — only reachable AFTER the gate; stub so import is clean.
vi.mock('@/lib/tokens', () => ({ generateToken: () => 'tok' }))
vi.mock('@/lib/nycmaid/client-contacts', () => ({
  sendClientEmail: async () => {},
  sendClientSMS: async () => ({ sent: 0, skipped: 0 }),
}))
vi.mock('@/lib/messaging/client-email', () => ({ confirmationEmailFor: async () => ({ subject: '', html: '' }) }))
vi.mock('@/lib/messaging/client-sms', () => ({ clientSmsTemplatesFor: async () => ({ bookingConfirmation: () => '' }) }))

import { createClientSession } from '@/lib/client-auth'
import { POST as recurringPOST } from './recurring/route'
import { GET as preferredGET, PUT as preferredPUT } from './preferred-cleaner/route'

beforeEach(() => {
  process.env.PORTAL_SECRET = 'unit-test-portal-secret'
  mockCookie.value = undefined
  tenantCtx.value = { id: TENANT_A }
  writes.inserts = []
  writes.updates = []
})

describe('client/recurring — forged client_id', () => {
  function reqFor(clientId: string): Request {
    return new Request('https://x/api/client/recurring', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        frequency: 'weekly',
        start_date: '2026-08-01',
        time: '10:00',
        hours: 3,
      }),
    })
  }

  it('REJECTS (403) and writes NOTHING when session=CLIENT_A acts on CLIENT_B', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const res = await recurringPOST(reqFor(CLIENT_B))
    expect(res.status).toBe(403)
    expect(writes.inserts).toHaveLength(0)
  })

  it('REJECTS (401) with no session — no schedule/booking created', async () => {
    const res = await recurringPOST(reqFor(CLIENT_A))
    expect(res.status).toBe(401)
    expect(writes.inserts).toHaveLength(0)
  })

  it('REJECTS (400) with no tenant context', async () => {
    tenantCtx.value = null
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const res = await recurringPOST(reqFor(CLIENT_A))
    expect(res.status).toBe(400)
    expect(writes.inserts).toHaveLength(0)
  })
})

describe('client/preferred-cleaner — forged client_id', () => {
  it('PUT REJECTS (403) and writes NOTHING when acting on another client', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const req = new Request('https://x/api/client/preferred-cleaner', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_B, preferred_cleaner_id: 'cleaner-x' }),
    })
    const res = await preferredPUT(req)
    expect(res.status).toBe(403)
    expect(writes.updates).toHaveLength(0)
  })

  it('GET REJECTS (403) — no preferred/familiar-cleaner leak for another client', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const req = new Request(`https://x/api/client/preferred-cleaner?client_id=${CLIENT_B}`)
    const res = await preferredGET(req)
    expect(res.status).toBe(403)
  })

  it('PUT REJECTS (401) with no session', async () => {
    const req = new Request('https://x/api/client/preferred-cleaner', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ client_id: CLIENT_A, preferred_cleaner_id: 'cleaner-x' }),
    })
    const res = await preferredPUT(req)
    expect(res.status).toBe(401)
    expect(writes.updates).toHaveLength(0)
  })
})
