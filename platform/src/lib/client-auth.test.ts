import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Client-portal ownership gate. This primitive is what closes the client/*
 * IDOR family (recurring, preferred-cleaner): the caller's SIGNED client_session
 * must match both the tenant AND the client_id being acted on. A forged/other
 * client_id must be REJECTED before any read or write.
 *
 * We mock next/headers (cookie source) and supabase (the do_not_service check);
 * the HMAC verify + tenant/client binding run for real against tokens minted by
 * the real createClientSession.
 */

const mockCookie = { value: undefined as string | undefined }
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (_name: string) => (mockCookie.value ? { value: mockCookie.value } : undefined),
  }),
}))

let clientLookup: { data: { do_not_service: boolean } | null }
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ single: async () => clientLookup }) }),
      }),
    }),
  },
}))

import { NextResponse } from 'next/server'
import { createClientSession, protectClientAPI } from './client-auth'

const TENANT_A = 'aaaaaaaa-0000-0000-0000-000000000001'
const TENANT_B = 'bbbbbbbb-0000-0000-0000-000000000002'
const CLIENT_A = '11111111-0000-0000-0000-000000000001'
const CLIENT_B = '22222222-0000-0000-0000-000000000002'

async function status(r: { clientId: string } | NextResponse): Promise<number | 'ok'> {
  return r instanceof NextResponse ? r.status : 'ok'
}

describe('protectClientAPI ownership gate', () => {
  beforeEach(() => {
    process.env.PORTAL_SECRET = 'unit-test-portal-secret'
    mockCookie.value = undefined
    clientLookup = { data: { do_not_service: false } }
  })

  it('REJECTS when no session cookie (401)', async () => {
    const r = await protectClientAPI(TENANT_A, CLIENT_A)
    expect(await status(r)).toBe(401)
  })

  it('REJECTS a garbage / tampered cookie (401)', async () => {
    mockCookie.value = 'not.a.valid.token'
    const r = await protectClientAPI(TENANT_A, CLIENT_A)
    expect(await status(r)).toBe(401)
  })

  it('REJECTS a session minted for another tenant (401) — no cross-tenant replay', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_B)
    const r = await protectClientAPI(TENANT_A, CLIENT_A)
    expect(await status(r)).toBe(401)
  })

  it('REJECTS a forged client_id: session=CLIENT_A but acting on CLIENT_B (403)', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const r = await protectClientAPI(TENANT_A, CLIENT_B)
    expect(await status(r)).toBe(403)
  })

  it('REJECTS a do_not_service client even with a valid session (401)', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    clientLookup = { data: { do_not_service: true } }
    const r = await protectClientAPI(TENANT_A, CLIENT_A)
    expect(await status(r)).toBe(401)
  })

  it('ACCEPTS a matching session + client_id + tenant', async () => {
    mockCookie.value = createClientSession(CLIENT_A, TENANT_A)
    const r = await protectClientAPI(TENANT_A, CLIENT_A)
    expect(r).not.toBeInstanceOf(NextResponse)
    if (!(r instanceof NextResponse)) expect(r.clientId).toBe(CLIENT_A)
  })
})
