/**
 * Cross-applicant collision probe — management-applications/draft/route.ts.
 *
 * Previously keyed solely by (tenant, ip_address, position). Two applicants
 * behind the same IP (mobile CGNAT, campus/corporate NAT, coffee-shop wifi —
 * all common) collided on the same row: GET returned the OTHER applicant's
 * name/email/phone/photo/video, and POST/DELETE could overwrite or wipe their
 * in-progress draft. Fixed by keying on a client-supplied opaque client_id
 * instead of the bare IP whenever one is supplied, falling back to IP only
 * when none is given (legacy/no-JS path).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import type { FakeSupabase } from '@/test/fake-supabase'

vi.mock('@/lib/supabase', async () => {
  const { createFakeSupabase } = await import('@/test/fake-supabase')
  const fake = createFakeSupabase()
  return { supabaseAdmin: fake }
})

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: vi.fn().mockResolvedValue({ allowed: true }),
}))

const TENANT_ID = 'tenant-A'
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT_ID }),
}))

import { supabaseAdmin } from '@/lib/supabase'
import { GET, POST, DELETE } from './route'

const fake = supabaseAdmin as unknown as FakeSupabase

const SHARED_IP = '203.0.113.9' // same NAT-exit IP for both applicants below

function getReq(qs: string): NextRequest {
  return new NextRequest(`http://x/api/management-applications/draft?${qs}`, {
    headers: { 'x-forwarded-for': SHARED_IP },
  })
}

function postReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://x/api/management-applications/draft', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': SHARED_IP },
    body: JSON.stringify(body),
  })
}

function deleteReq(qs: string): NextRequest {
  return new NextRequest(`http://x/api/management-applications/draft?${qs}`, {
    method: 'DELETE',
    headers: { 'x-forwarded-for': SHARED_IP },
  })
}

const ALICE_ID = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const BOB_ID = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'

beforeEach(() => {
  fake._store.clear()
})

describe('two applicants sharing an IP, each with their own client_id', () => {
  it('does not leak Alice\'s draft to Bob on GET', async () => {
    await POST(postReq({
      form_data: { name: 'Alice Applicant', email: 'alice@example.com' },
      position: 'operations-coordinator',
      photo_url: 'https://storage.example/alice.jpg',
      client_id: ALICE_ID,
    }))

    const bobRes = await GET(getReq(`position=operations-coordinator&client_id=${BOB_ID}`))
    const bobBody = await bobRes.json()
    expect(bobBody.draft).toBeNull()

    const aliceRes = await GET(getReq(`position=operations-coordinator&client_id=${ALICE_ID}`))
    const aliceBody = await aliceRes.json()
    expect(aliceBody.draft.form_data.name).toBe('Alice Applicant')
  })

  it("Bob's DELETE does not wipe Alice's draft", async () => {
    await POST(postReq({
      form_data: { name: 'Alice Applicant' },
      position: 'operations-coordinator',
      client_id: ALICE_ID,
    }))

    await DELETE(deleteReq(`position=operations-coordinator&client_id=${BOB_ID}`))

    const aliceRes = await GET(getReq(`position=operations-coordinator&client_id=${ALICE_ID}`))
    const aliceBody = await aliceRes.json()
    expect(aliceBody.draft.form_data.name).toBe('Alice Applicant')
  })

  it("Bob's POST does not overwrite Alice's draft", async () => {
    await POST(postReq({
      form_data: { name: 'Alice Applicant' },
      position: 'operations-coordinator',
      client_id: ALICE_ID,
    }))
    await POST(postReq({
      form_data: { name: 'Bob Applicant' },
      position: 'operations-coordinator',
      client_id: BOB_ID,
    }))

    const aliceRes = await GET(getReq(`position=operations-coordinator&client_id=${ALICE_ID}`))
    expect((await aliceRes.json()).draft.form_data.name).toBe('Alice Applicant')

    const bobRes = await GET(getReq(`position=operations-coordinator&client_id=${BOB_ID}`))
    expect((await bobRes.json()).draft.form_data.name).toBe('Bob Applicant')
  })

  it('own client_id still resumes own draft (no regression on the happy path)', async () => {
    await POST(postReq({
      form_data: { name: 'Alice Applicant', phone: '555-0100' },
      position: 'operations-coordinator',
      client_id: ALICE_ID,
    }))
    const res = await GET(getReq(`position=operations-coordinator&client_id=${ALICE_ID}`))
    const body = await res.json()
    expect(body.draft.form_data.phone).toBe('555-0100')
  })
})

describe('legacy no-client_id fallback', () => {
  it('falls back to bare-IP keying when no client_id is supplied (JS-disabled path)', async () => {
    await POST(postReq({
      form_data: { name: 'No JS Applicant' },
      position: 'operations-coordinator',
    }))
    const res = await GET(getReq('position=operations-coordinator'))
    const body = await res.json()
    expect(body.draft.form_data.name).toBe('No JS Applicant')
  })

  it('rejects a malformed client_id rather than silently trusting it', async () => {
    // Not our format (e.g. attacker guessing a victim's IP-based fallback key
    // isn't blocked by format validation, but garbage/oversized input is
    // rejected down to the IP fallback instead of being stored verbatim).
    await POST(postReq({
      form_data: { name: 'No JS Applicant' },
      position: 'operations-coordinator',
    }))
    const res = await GET(getReq('position=operations-coordinator&client_id=bad'))
    const body = await res.json()
    // 'bad' fails the format check -> falls back to IP -> finds the no-client_id draft.
    expect(body.draft.form_data.name).toBe('No JS Applicant')
  })
})
