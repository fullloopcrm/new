/**
 * sec-07 integration proof, team-portal side: a team_member whose pin column
 * already holds an AES-256-GCM envelope logs in via findRowByPin's
 * decrypt-and-compare fallback, and a legacy-plaintext sibling on the same
 * tenant keeps working through the fast path in the same request cycle.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.hoisted(() => {
  process.env.TEAM_PORTAL_SECRET = 'test-team-portal-secret'
})

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true, remaining: 10 }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'
import { encryptSecret } from '@/lib/secret-crypto'

const fake = supabaseAdmin as unknown as FakeSupabase

const KEY = 'e'.repeat(64)
const ORIGINAL_KEY = process.env.SECRET_ENCRYPTION_KEY
const TENANT_ID = 'tenant-team-enc'
const TENANT_SLUG = 'team-enc-tenant'
const ENCRYPTED_PIN = '334455'
const LEGACY_PIN = '667788'

function req(pin: string): Request {
  return new Request('http://x/api/team-portal/auth', {
    method: 'POST',
    body: JSON.stringify({ tenant_slug: TENANT_SLUG, pin }),
  })
}

beforeEach(() => {
  process.env.SECRET_ENCRYPTION_KEY = KEY
  fake._store.clear()
  fake._seed('tenants', [{ id: TENANT_ID, name: 'Team Enc Co', slug: TENANT_SLUG, status: 'active', phone: '+15559990000' }])
  fake._seed('team_members', [
    { id: 'tm-encrypted', tenant_id: TENANT_ID, name: 'Encrypted Worker', pin: encryptSecret(ENCRYPTED_PIN), status: 'active', preferred_language: 'en', pay_rate: 22, avatar_url: null, role: 'worker' },
    { id: 'tm-legacy', tenant_id: TENANT_ID, name: 'Legacy Worker', pin: LEGACY_PIN, status: 'active', preferred_language: 'en', pay_rate: 24, avatar_url: null, role: 'worker' },
  ])
})

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.SECRET_ENCRYPTION_KEY
  else process.env.SECRET_ENCRYPTION_KEY = ORIGINAL_KEY
})

describe('POST /api/team-portal/auth — login against an already-encrypted pin', () => {
  it('logs in via the decrypt-and-compare fallback when the stored pin is an AES envelope', async () => {
    const res = await POST(req(ENCRYPTED_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-encrypted')
  })

  it('a legacy-plaintext sibling on the same tenant still logs in via the fast path', async () => {
    const res = await POST(req(LEGACY_PIN))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.member.id).toBe('tm-legacy')
  })

  it('rejects a wrong pin even with an encrypted row present to scan', async () => {
    const res = await POST(req('000000'))
    expect(res.status).toBe(401)
  })
})
