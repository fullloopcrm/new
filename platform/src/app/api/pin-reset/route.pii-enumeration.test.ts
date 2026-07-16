/**
 * PIN-RESET SEND_CODE — operator enumeration via response shape.
 *
 * The `send_code` step previously returned a distinct 404 ("No operator
 * found with that phone or email") when `contact` didn't match a
 * tenant_members row, vs. a 200 `{ sent: true, via }` when it did (and a 503
 * "No phone/email on file" when the member matched but had no delivery
 * channel). That let a caller who already knew or was guessing a phone/email
 * confirm whether it belongs to a real operator at this business, purely
 * from the HTTP status/body -- an enumeration primitive.
 *
 * This mirrors the codebase's own established convention for the same class
 * of endpoint: referrers/auth/request always responds `{ ok: true }`
 * regardless of match, specifically "so this endpoint can't be used to
 * enumerate who's a partner." pin-reset's send_code now does the same:
 * unknown contact, known contact with no delivery channel, and known contact
 * with successful delivery all return the identical `{ sent: true }` shape.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { FakeSupabase, Row } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabase: fake, supabaseAdmin: fake, __fake: fake }
})

vi.mock('next/headers', () => ({
  headers: async () => new Map([
    ['x-tenant-id', TENANT_ID],
    ['x-tenant-sig', 'sig'],
  ]),
}))

vi.mock('@/lib/tenant-header-sig', () => ({
  verifyTenantHeaderSig: () => true,
}))

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async () => ({ allowed: true }),
}))

// Delivery always fails -- isolates the "member exists but code can't be
// delivered" path from real network calls / Resend config.
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async () => { throw new Error('no delivery in test') }),
}))
vi.mock('@/lib/sms', () => ({
  sendSMS: vi.fn(async () => { throw new Error('no delivery in test') }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { POST } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const TENANT_ID = 'tenant-1'
const KNOWN_EMAIL = 'member@example.com'
const UNDELIVERABLE_EMAIL = 'undeliverable@example.com'
const KNOWN_PHONE_MEMBER_ID = 'member-2'

function sendCodeReq(contact: string): Request {
  return new Request('http://x/api/pin-reset', {
    method: 'POST',
    body: JSON.stringify({ action: 'send_code', contact }),
  })
}

beforeEach(() => {
  fake._store.clear()
  fake._seed('tenants', [
    { id: TENANT_ID, name: 'Acme', telnyx_api_key: null, telnyx_phone: null, resend_api_key: null } as Row,
  ])
  fake._seed('tenant_members', [
    { id: 'member-1', tenant_id: TENANT_ID, name: 'Known Member', phone: null, email: KNOWN_EMAIL, pin_hash: null } as Row,
    // Matchable (has an email), but sendEmail/sendSMS are mocked to always
    // throw -- exercises the "found but delivery failed" path.
    { id: KNOWN_PHONE_MEMBER_ID, tenant_id: TENANT_ID, name: 'Undeliverable Member', phone: null, email: UNDELIVERABLE_EMAIL, pin_hash: null } as Row,
  ])
})

describe('POST /api/pin-reset send_code — response is identical regardless of match', () => {
  it('returns the generic { sent: true } shape for a contact that matches no operator', async () => {
    const res = await POST(sendCodeReq('nobody@example.com'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ sent: true })
  })

  it('returns the identical shape for a contact that matches a real operator', async () => {
    const res = await POST(sendCodeReq(KNOWN_EMAIL))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ sent: true })
  })

  it('does not leak via a distinct status/body when the matched member exists but delivery fails', async () => {
    // Old code returned 503 "No phone/email on file to send a code" here,
    // distinguishing this from both the not-found and successful-send cases.
    const res = await POST(sendCodeReq(UNDELIVERABLE_EMAIL))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body).toEqual({ sent: true })
  })
})
