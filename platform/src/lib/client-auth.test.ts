import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * protectClientAPI (src/lib/client-auth.ts) gates every /api/client/* and
 * cookie-based /api/portal/* route for the copied-nycmaid client portal. Its
 * 30-day session cookie previously checked tenant identity + do_not_service
 * only — never the TENANT's own status. A suspended/cancelled/deleted tenant
 * already goes dark at the owner login (tenant-query.ts, tenant.ts) and the
 * public site (middleware), both gated on tenantServesSite; this cookie had
 * no such check, so an existing client session kept working — booking,
 * rescheduling, messaging — for up to 30 days after the tenant went dark
 * everywhere else. This file locks that gate in.
 *
 * verifyClientSessionToken is exercised for REAL (not mocked) via
 * createClientSession, since it's simple HMAC signing local to this file —
 * only supabaseAdmin and next/headers cookies() are doubled.
 */

type Eqs = Record<string, unknown>
let resolve: (table: string, eqs: Eqs) => { data: unknown; error: unknown }
let singleCalls: Array<{ table: string; eqs: Eqs }>

function builder(table: string) {
  const eqs: Eqs = {}
  const chain = {
    select: () => chain,
    eq: (col: string, val: unknown) => {
      eqs[col] = val
      return chain
    },
    single: async () => {
      singleCalls.push({ table, eqs })
      return resolve(table, eqs)
    },
  }
  return chain
}

vi.mock('./supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

const mockCookieStore = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (mockCookieStore.has(name) ? { value: mockCookieStore.get(name) } : undefined) }),
}))

vi.stubEnv('PORTAL_SECRET', 'test-portal-secret')

import { createClientSession, protectClientAPI } from './client-auth'
import { NextResponse } from 'next/server'

const TENANT_A = 't-A'
const CLIENT_A = 'client-A'

function setSession(clientId = CLIENT_A, tenantId = TENANT_A) {
  mockCookieStore.set('client_session', createClientSession(clientId, tenantId))
}

beforeEach(() => {
  singleCalls = []
  resolve = () => ({ data: null, error: null })
  mockCookieStore.clear()
})

describe('protectClientAPI', () => {
  it('authorizes a valid session against an active tenant, non-do_not_service client', async () => {
    setSession()
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.id === TENANT_A) return { data: { status: 'active' }, error: null }
      if (table === 'clients' && eqs.id === CLIENT_A) return { data: { do_not_service: false }, error: null }
      return { data: null, error: null }
    }

    const result = await protectClientAPI(TENANT_A)
    expect(result).toEqual({ clientId: CLIENT_A })
  })

  it('returns 401 when there is no session cookie', async () => {
    const result = await protectClientAPI(TENANT_A)
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it('returns 401 when the session tenant does not match the expected tenant', async () => {
    setSession(CLIENT_A, 't-OTHER')
    const result = await protectClientAPI(TENANT_A)
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it.each(['suspended', 'cancelled', 'deleted'])(
    'WRONG-STATUS PROBE: a %s tenant locks out an otherwise-valid, otherwise-serviceable client session (401)',
    async (status) => {
      setSession()
      resolve = (table, eqs) => {
        if (table === 'tenants' && eqs.id === TENANT_A) return { data: { status }, error: null }
        if (table === 'clients' && eqs.id === CLIENT_A) return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      }

      const result = await protectClientAPI(TENANT_A)
      expect(result).toBeInstanceOf(NextResponse)
      expect((result as NextResponse).status).toBe(401)
      const body = await (result as NextResponse).json()
      expect(body.error).toBe('Tenant account is not active')
      // Must fail closed BEFORE ever looking at the client row.
      expect(singleCalls.some((c) => c.table === 'clients')).toBe(false)
    },
  )

  it('WRONG-STATUS PROBE: a tenant row that fails to resolve is treated as not-active (fail closed)', async () => {
    setSession(CLIENT_A, 't-ghost')
    resolve = () => ({ data: null, error: null })

    const result = await protectClientAPI('t-ghost')
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it.each(['setup', 'pending', 'active'])(
    'a %s tenant (still serving) does not block an otherwise-valid session',
    async (status) => {
      setSession()
      resolve = (table, eqs) => {
        if (table === 'tenants' && eqs.id === TENANT_A) return { data: { status }, error: null }
        if (table === 'clients' && eqs.id === CLIENT_A) return { data: { do_not_service: false }, error: null }
        return { data: null, error: null }
      }

      const result = await protectClientAPI(TENANT_A)
      expect(result).toEqual({ clientId: CLIENT_A })
    },
  )

  it('still blocks a do_not_service client even on an active tenant', async () => {
    setSession()
    resolve = (table, eqs) => {
      if (table === 'tenants' && eqs.id === TENANT_A) return { data: { status: 'active' }, error: null }
      if (table === 'clients' && eqs.id === CLIENT_A) return { data: { do_not_service: true }, error: null }
      return { data: null, error: null }
    }

    const result = await protectClientAPI(TENANT_A)
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(401)
  })

  it('enforces requiredClientId when provided (403 on mismatch), before any tenant/client DB lookup', async () => {
    setSession()
    const result = await protectClientAPI(TENANT_A, 'someone-else')
    expect(result).toBeInstanceOf(NextResponse)
    expect((result as NextResponse).status).toBe(403)
    expect(singleCalls.length).toBe(0)
  })
})
