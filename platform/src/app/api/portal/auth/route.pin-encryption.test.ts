/**
 * sec-07 integration proof: a client whose pin column already holds an
 * AES-256-GCM envelope (post-migration state) can still log in through the
 * real route, via findRowByPin's decrypt-and-compare fallback -- and a
 * legacy-plaintext sibling client on the SAME tenant keeps working through
 * the fast path, in the same request cycle. request_pin is proven to store
 * the new pin encrypted, not plaintext.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn(async () => ({ allowed: true, remaining: 10 })),
}))

const sendEmailMock = vi.fn(async (_opts: { to: string; html: string; subject: string }) => ({}))
vi.mock('@/lib/email', () => ({
  sendEmail: (opts: { to: string; html: string; subject: string }) => sendEmailMock(opts),
  tenantSender: () => 'Full Loop <hello@fullloopcrm.com>',
}))

vi.mock('./token', () => ({
  generateCode: () => '112233',
  createToken: (clientId: string, tenantId: string) => `tok.${clientId}.${tenantId}`,
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'
import { encryptSecret, decryptSecret } from '@/lib/secret-crypto'

const fake = supabaseAdmin as unknown as FakeSupabase

const KEY = 'd'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY
const TENANT_ID = 'tenant-enc'
const TENANT_SLUG = 'enc-tenant'
const ENCRYPTED_CLIENT_ID = 'client-encrypted'
const LEGACY_CLIENT_ID = 'client-legacy'
const ENCRYPTED_PIN = '778899'
const LEGACY_PIN = '112200'

function seed() {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, slug: TENANT_SLUG, status: 'active', name: 'Enc Tenant', primary_color: null, logo_url: null, email_from: null, resend_api_key: null },
  ])
  fake._seed('clients', [
    { id: ENCRYPTED_CLIENT_ID, tenant_id: TENANT_ID, name: 'Encrypted Client', phone: '+15551110000', email: 'enc@x.com', pin: encryptSecret(ENCRYPTED_PIN), created_at: '2026-02-01T00:00:00Z' },
    { id: LEGACY_CLIENT_ID, tenant_id: TENANT_ID, name: 'Legacy Client', phone: '+15552220000', email: 'legacy@x.com', pin: LEGACY_PIN, created_at: '2026-01-01T00:00:00Z' },
  ])
}

function loginReq(pin: string) {
  return new Request('http://x/api/portal/auth', {
    method: 'POST',
    body: JSON.stringify({ action: 'login', pin, tenant_slug: TENANT_SLUG }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'portal-test-secret'
  process.env.SECRET_ENCRYPTION_KEY = KEY
  sendEmailMock.mockClear()
  seed()
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('POST /api/portal/auth — login against an already-encrypted pin', () => {
  it('logs in via the decrypt-and-compare fallback when the stored pin is an AES envelope', async () => {
    const res = await POST(loginReq(ENCRYPTED_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client).toEqual({ id: ENCRYPTED_CLIENT_ID, name: 'Encrypted Client' })
  })

  it('a legacy-plaintext sibling on the same tenant still logs in via the fast path', async () => {
    const res = await POST(loginReq(LEGACY_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client).toEqual({ id: LEGACY_CLIENT_ID, name: 'Legacy Client' })
  })

  it('rejects a wrong pin even with an encrypted row present to scan', async () => {
    const res = await POST(loginReq('000000'))
    expect(res.status).toBe(401)
  })

  it('confirms the seeded pin really is stored as an AES envelope, not plaintext', () => {
    const stored = fake._all('clients').find((c) => c.id === ENCRYPTED_CLIENT_ID)?.pin as string
    expect(stored.startsWith('v1:')).toBe(true)
    expect(stored).not.toBe(ENCRYPTED_PIN)
    expect(decryptSecret(stored)).toBe(ENCRYPTED_PIN)
  })
})

describe('POST /api/portal/auth — request_pin writes an encrypted value', () => {
  it('stores the new pin encrypted, not as plaintext', async () => {
    const res = await POST(new Request('http://x/api/portal/auth', {
      method: 'POST',
      body: JSON.stringify({ action: 'request_pin', contact: 'legacy@x.com', tenant_slug: TENANT_SLUG }),
    }))
    expect(res.status).toBe(200)
    const stored = fake._all('clients').find((c) => c.id === LEGACY_CLIENT_ID)?.pin as string
    expect(stored.startsWith('v1:')).toBe(true)
    expect(decryptSecret(stored)).toBe('112233')
  })
})
