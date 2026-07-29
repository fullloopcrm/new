import { describe, it, expect, beforeEach, vi } from 'vitest'
import { makeTenantDbFake, type FakeStoreHandle } from '@/test/tenant-db-fake'

/**
 * /join/[token] used to dead-end: it depended on getOwnerUserId() (a dormant
 * Clerk-era session helper — see lib/owner-session.ts — that never resolves
 * for a fresh invitee since no self-serve session mechanism exists). This
 * route replaces that with the same real, working credential every other
 * white-glove-onboarded operator gets: a PIN on tenant_members, verified at
 * login by /api/admin-auth against pin_hash (see /api/admin/users for the
 * identical mint-a-PIN pattern this ports).
 *
 * The last describe block below drives the REAL /api/admin-auth login route
 * with the PIN this route hands back, proving the invitee doesn't just get a
 * DB row — they reach an actual authenticated (tenant_admin) session.
 */

const TENANT = 'tenant-A'

const h = vi.hoisted(() => ({
  seq: 0,
  store: {} as Record<string, Array<Record<string, unknown>>>,
})) as unknown as FakeStoreHandle

vi.mock('@/lib/supabase', () => {
  const fake = makeTenantDbFake(h)
  return { supabaseAdmin: fake, supabase: fake }
})

// Deterministic, no ADMIN_TOKEN_SECRET dependency — same convention as
// route.owner-escalation.test.ts for /api/admin/users.
vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash-${pin}`,
  generateAdminPin: () => '654321',
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))

import { POST } from './route'

function postReq(token: string, body: unknown) {
  return POST(
    new Request('http://x', { method: 'POST', body: JSON.stringify(body) }),
    { params: Promise.resolve({ token }) },
  )
}

const future = (hours = 24) => new Date(Date.now() + hours * 3600 * 1000).toISOString()
const past = () => new Date(Date.now() - 3600 * 1000).toISOString()

beforeEach(() => {
  h.seq = 0
  h.store = {
    tenants: [{ id: TENANT, name: 'Acme Cleaning', status: 'setup' }],
    tenant_invites: [
      {
        id: 'inv-1',
        tenant_id: TENANT,
        email: 'new@x.com',
        role: 'owner',
        token: 'good-token',
        accepted: false,
        expires_at: future(),
        // Simulates the `*, tenants(id, name, domain, slug)` embed the route
        // selects — the in-memory fake doesn't resolve real FK embeds, so the
        // embedded shape is pre-seeded directly (same convention used by
        // api/invoices/public/[token]/checkout/route.test.ts).
        tenants: { id: TENANT, name: 'Acme Cleaning', domain: null, slug: 'acme' },
      },
    ],
    tenant_members: [],
    security_events: [],
    notifications: [],
    rate_limit_events: [],
  }
})

describe('POST /api/invites/[token]/accept — validation', () => {
  it('404s for an unknown token', async () => {
    const res = await postReq('bad-token', { name: 'Jane' })
    expect(res.status).toBe(404)
  })

  it('400s when the invite was already accepted', async () => {
    h.store.tenant_invites[0].accepted = true
    const res = await postReq('good-token', { name: 'Jane' })
    expect(res.status).toBe(400)
  })

  it('400s when the invite has expired', async () => {
    h.store.tenant_invites[0].expires_at = past()
    const res = await postReq('good-token', { name: 'Jane' })
    expect(res.status).toBe(400)
  })

  it('400s when name is missing, and never touches tenant_members', async () => {
    const res = await postReq('good-token', {})
    expect(res.status).toBe(400)
    expect(h.store.tenant_members.length).toBe(0)
  })
})

describe('POST /api/invites/[token]/accept — acceptance', () => {
  it('creates a PIN-backed tenant_member, marks the invite accepted, and activates the tenant', async () => {
    const res = await postReq('good-token', { name: 'Jane Smith' })
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.pin).toBe('654321')
    expect(json.tenantName).toBe('Acme Cleaning')
    expect(json.loginUrl).toContain('/fullloop')

    expect(h.store.tenant_members.length).toBe(1)
    const member = h.store.tenant_members[0]
    expect(member.name).toBe('Jane Smith')
    expect(member.email).toBe('new@x.com')
    expect(member.role).toBe('owner')
    expect(member.pin_hash).toBe('hash-654321')

    expect(h.store.tenant_invites[0].accepted).toBe(true)
    expect(h.store.tenants[0].status).toBe('active')
  })

  it('reuses the existing member row on a re-invite instead of creating a duplicate', async () => {
    h.store.tenant_members = [
      { id: 'm-existing', tenant_id: TENANT, email: 'new@x.com', name: 'Old Name', role: 'staff', pin_hash: 'old-hash' },
    ]

    const res = await postReq('good-token', { name: 'Jane Smith' })
    expect(res.status).toBe(200)
    expect(h.store.tenant_members.length).toBe(1)
    expect(h.store.tenant_members[0].id).toBe('m-existing')
    expect(h.store.tenant_members[0].pin_hash).toBe('hash-654321')
    expect(h.store.tenant_members[0].role).toBe('owner')
  })

  it('rejects a second accept attempt on the same, now-accepted token', async () => {
    await postReq('good-token', { name: 'Jane Smith' })
    const res = await postReq('good-token', { name: 'Jane Smith' })
    expect(res.status).toBe(400)
    expect(h.store.tenant_members.length).toBe(1)
  })
})

describe('end to end — the minted PIN actually authenticates', () => {
  it('lets the invitee log in with the PIN accept() returned, reaching a real tenant_admin session', async () => {
    const acceptRes = await postReq('good-token', { name: 'Jane Smith' })
    expect(acceptRes.status).toBe(200)
    const { pin } = await acceptRes.json()

    // Drive the REAL /api/admin-auth login route with that PIN. Only the
    // collaborators specific to THIS login leg are mocked (headers, tenant
    // header signature, rate limit, login alert) — supabase and admin-pin
    // stay the same mocks registered above, still backed by the same `h`
    // store the accept route just wrote the tenant_member into.
    vi.resetModules()
    process.env.ADMIN_TOKEN_SECRET = 'test-secret-for-invite-e2e'
    vi.doMock('next/headers', () => ({
      headers: async () => ({
        get: (k: string) => (k === 'x-tenant-id' ? TENANT : k === 'x-tenant-sig' ? 'sig' : null),
      }),
    }))
    vi.doMock('@/lib/tenant-header-sig', () => ({ verifyTenantHeaderSig: () => true }))
    vi.doMock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))
    vi.doMock('@/lib/login-alert', () => ({ sendLoginAlert: async () => {} }))

    const { POST: loginPost } = await import('@/app/api/admin-auth/route')
    const loginRes = await loginPost(
      new Request('http://x', { method: 'POST', body: JSON.stringify({ pin }) }),
    )

    expect(loginRes.status).toBe(200)
    const loginJson = await loginRes.json()
    expect(loginJson.success).toBe(true)
    expect(loginJson.role).toBe('tenant_admin')
    expect(loginRes.headers.get('set-cookie')).toContain('admin_token=')
  })
})
