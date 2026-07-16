/**
 * CLIENT VERIFY-CODE — ILIKE wildcard account-takeover.
 *
 * Sibling of the class already closed in client/check/route.ts's escapeLike
 * fix, missed in this route. send-code/route.ts sends the OTP to whatever
 * `email` string a caller submits (no format validation) and stores
 * verification_codes keyed by that SAME raw string as `identifier`. So a
 * caller can request+receive a valid code for ANY string they can receive
 * mail at (including one containing '%'/'_' -- both legal RFC 5322
 * local-part chars). Once that code is verified, this route resolves the
 * SESSION-BEARING client via `.ilike('email', email.trim())` with NO
 * wildcard escaping -- so the same attacker-controlled string that won the
 * OTP check also drives an unrelated, potentially wildcard, client lookup.
 * A bare '%' (or any '%'-bearing prefix) lets the OTP-authenticated caller
 * be handed a COMPLETELY DIFFERENT, pre-existing client's session --
 * full account takeover with zero knowledge of the victim's real email.
 *
 * Fix: escapeLike() on both ilike('email', ...) call sites (the primary
 * lookup and the unique-violation race-recovery lookup) so the match is
 * always literal, matching client/check/route.ts's precedent.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

const TENANT_ID = 'tenant-1'

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

vi.mock('@/lib/notify', () => ({ notify: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true }) }))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

function verifyRequest(email: string, code: string): Request {
  return new Request('http://x/api/client/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code }),
  })
}

beforeEach(() => {
  process.env.PORTAL_SECRET = 'test-secret'
  fake._store.clear()
  // A real, pre-existing client the attacker has no knowledge of.
  fake._seed('clients', [
    { id: 'victim-client', tenant_id: TENANT_ID, email: 'victim@realdomain.com', name: 'Victim Customer', do_not_service: false } as Row,
  ])
})

describe('POST /api/client/verify-code — ILIKE wildcard cannot hijack another client session', () => {
  it('a bare "%" identifier (attacker-controlled, OTP-verified) does NOT return the pre-existing victim client', async () => {
    // Attacker requested (and received) a code for the literal string '%'.
    fake._seed('verification_codes', [
      { id: 'vc-1', tenant_id: TENANT_ID, identifier: '%', code: '111111', expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() } as Row,
    ])

    const res = await POST(verifyRequest('%', '111111'))
    expect(res.status).toBe(200)
    const body = await res.json()

    // Must NOT be handed the victim's session.
    expect(body.client.id).not.toBe('victim-client')
    // Falls through to legitimate create-new-client behavior instead.
    expect(fake._all('clients').some((c) => c.id === 'victim-client')).toBe(true)
    expect(fake._all('clients').length).toBe(2)
  })

  it('a prefix-wildcard identifier ("vic%") does NOT match the victim by prefix', async () => {
    fake._seed('verification_codes', [
      { id: 'vc-2', tenant_id: TENANT_ID, identifier: 'vic%', code: '222222', expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() } as Row,
    ])

    const res = await POST(verifyRequest('vic%', '222222'))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(body.client.id).not.toBe('victim-client')
  })

  it('still matches the real client exactly (case-insensitive) once escaped', async () => {
    fake._seed('verification_codes', [
      { id: 'vc-3', tenant_id: TENANT_ID, identifier: 'victim@realdomain.com', code: '333333', expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() } as Row,
    ])

    const res = await POST(verifyRequest('VICTIM@REALDOMAIN.COM', '333333'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.client.id).toBe('victim-client')
  })
})
