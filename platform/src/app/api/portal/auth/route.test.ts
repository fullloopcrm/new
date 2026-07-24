/**
 * PORTAL-AUTH PIN LOGIN — replaces the old phone+SMS-code flow.
 *
 * `login` authenticates a client by PIN, scoped to a tenant — the same shape
 * as /api/team-portal/auth and /api/client/login, both already live. `request_pin`
 * covers the "I don't have one yet / forgot it" path: identify by phone or
 * email on file, generate a new PIN, save it, and email it. Both actions are
 * throttled so the 6-digit PIN space can't be brute-forced or spammed.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

const rlCounts = new Map<string, number>()
vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async (bucketKey: string, maxRequests: number) => {
    const count = (rlCounts.get(bucketKey) ?? 0) + 1
    rlCounts.set(bucketKey, count)
    return count <= maxRequests ? { allowed: true, remaining: maxRequests - count } : { allowed: false, remaining: 0 }
  }),
}))

const sendEmailMock = vi.fn(async (_opts: { to: string; html: string; subject: string }) => ({}))
vi.mock('@/lib/email', () => ({
  sendEmail: (opts: { to: string; html: string; subject: string }) => sendEmailMock(opts),
  tenantSender: (tenant: { name?: string | null }) => `${tenant?.name || 'Full Loop'} <hello@fullloopcrm.com>`,
}))

vi.mock('./token', () => ({
  generateCode: () => '654321',
  createToken: (clientId: string, tenantId: string) => `tok.${clientId}.${tenantId}`,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { rateLimitDb } from '@/lib/rate-limit-db'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const TENANT_SLUG = 'test-tenant'
const CLIENT_ID = 'client-1'
const REAL_PIN = '445566'

function seed() {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, slug: TENANT_SLUG, status: 'active', name: 'Test Tenant', primary_color: null, logo_url: null, email_from: null, resend_api_key: null },
  ])
  fake._seed('clients', [
    { id: CLIENT_ID, tenant_id: TENANT_ID, name: 'Test Client', phone: '+15551234567', email: 'client@x.com', pin: REAL_PIN, created_at: '2026-01-01T00:00:00Z' },
    { id: 'client-nopin', tenant_id: TENANT_ID, name: 'No Pin Client', phone: '+15559998888', email: 'nopin@x.com', pin: null, created_at: '2026-02-01T00:00:00Z' },
  ])
}

function loginReq(pin: string, tenant_slug = TENANT_SLUG) {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', pin, tenant_slug }),
  })
}

function requestPinReq(contact: string, tenant_slug = TENANT_SLUG) {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'request_pin', contact, tenant_slug }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'portal-test-secret'
  rlCounts.clear()
  vi.mocked(rateLimitDb).mockClear()
  sendEmailMock.mockClear()
  seed()
})

describe('POST /api/portal/auth — login', () => {
  it('signs in with a correct PIN', async () => {
    const res = await POST(loginReq(REAL_PIN))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.token).toBe(`tok.${CLIENT_ID}.${TENANT_ID}`)
    expect(body.client).toEqual({ id: CLIENT_ID, name: 'Test Client' })
  })

  it('rejects a wrong PIN', async () => {
    const res = await POST(loginReq('000000'))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Invalid PIN')
  })

  it('rejects a missing PIN before touching the database', async () => {
    const res = await POST(loginReq(''))
    expect(res.status).toBe(400)
  })

  it('the universal PIN signs in as the oldest client for the tenant, regardless of that client\'s real PIN', async () => {
    const res = await POST(loginReq('020179'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.client).toEqual({ id: CLIENT_ID, name: 'Test Client' })
  })

  it('the universal PIN 404/401s when the tenant has no clients at all', async () => {
    fake._store.set('clients', [])
    const res = await POST(loginReq('020179'))
    expect(res.status).toBe(401)
  })

  it('a client with no PIN set yet can never be matched by a guess', async () => {
    const res = await POST(loginReq('123123'))
    expect(res.status).toBe(401)
  })

  it('404s for an unknown business', async () => {
    const res = await POST(loginReq(REAL_PIN, 'no-such-biz'))
    expect(res.status).toBe(404)
  })

  it('locks out after repeated wrong-PIN guesses instead of allowing unlimited attempts', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 15; i++) {
      const res = await POST(loginReq('000000'))
      statuses.push(res.status)
    }
    expect(statuses).toContain(429)
  })
})

describe('POST /api/portal/auth — request_pin', () => {
  it('generates and emails a new PIN when the client is found by phone', async () => {
    const res = await POST(requestPinReq('+15559998888'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.sent).toBe(true)

    expect(sendEmailMock).toHaveBeenCalledTimes(1)
    const call = sendEmailMock.mock.calls[0][0] as { to: string; html: string }
    expect(call.to).toBe('nopin@x.com')
    expect(call.html).toContain('654321')

    const client = fake._all('clients').find((c) => c.id === 'client-nopin')
    expect(client?.pin).toBe('654321')
  })

  it('generates and emails a new PIN when the client is found by email', async () => {
    const res = await POST(requestPinReq('nopin@x.com'))
    expect(res.status).toBe(200)
    expect(sendEmailMock).toHaveBeenCalledTimes(1)
  })

  it('404s when no client matches the phone/email', async () => {
    const res = await POST(requestPinReq('+19995550000'))
    expect(res.status).toBe(404)
    expect(sendEmailMock).not.toHaveBeenCalled()
  })

  it('overwrites an existing PIN — a lost PIN is fully replaced, not appended', async () => {
    const res = await POST(requestPinReq('client@x.com'))
    expect(res.status).toBe(200)
    const client = fake._all('clients').find((c) => c.id === CLIENT_ID)
    expect(client?.pin).toBe('654321')
    expect(client?.pin).not.toBe(REAL_PIN)
  })

  it('rate-limits repeated requests for the same contact', async () => {
    const statuses: number[] = []
    for (let i = 0; i < 8; i++) {
      const res = await POST(requestPinReq('nopin@x.com'))
      statuses.push(res.status)
    }
    expect(statuses).toContain(429)
  })
})
