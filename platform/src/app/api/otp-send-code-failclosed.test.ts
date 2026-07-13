import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression for a fail-open gap on the OTP *issuance* side of three login/
 * reset flows: portal/auth send_code, pin-reset send_code, client/send-code.
 * Each already throttles its *verify* side with failClosed:true (a DB outage
 * denies rather than letting brute force through), but the send_code side
 * that mints and delivers the code was left at the rateLimitDb default
 * (fail-open) — a rate_limit_events hiccup let an attacker spam-send
 * unlimited SMS/email codes to any phone/email (cost abuse, harassment),
 * exactly the class the lib's own doc comment calls out as auth-critical
 * (OTP/login) and requiring failClosed.
 */

const rlOpts = new Map<string, { failClosed?: boolean } | undefined>()

vi.mock('@/lib/rate-limit-db', () => ({
  rateLimitDb: async (bucketKey: string, _max: number, _windowMs: number, opts?: { failClosed?: boolean }) => {
    rlOpts.set(bucketKey, opts)
    return { allowed: true, remaining: 1 }
  },
}))

beforeEach(() => {
  rlOpts.clear()
  vi.resetModules()
})

describe('portal/auth send_code', () => {
  it('opts the send_code throttle into failClosed', async () => {
    vi.doMock('@/lib/supabase', () => {
      function chain(table: string) {
        const c: Record<string, unknown> = {
          select: () => c,
          eq: () => c,
          delete: () => c,
          insert: async () => ({ data: null, error: null }),
          single: async () => {
            if (table === 'tenants') {
              return { data: { id: 'tenant-1', name: 'Acme', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'k' }, error: null }
            }
            if (table === 'clients') {
              return { data: { id: 'client-1', name: 'C', phone: '+15551230000', email: 'c@x.com' }, error: null }
            }
            return { data: null, error: null }
          },
        }
        return c
      }
      return { supabaseAdmin: { from: (t: string) => chain(t) } }
    })
    vi.doMock('@/lib/email', () => ({ sendEmail: async () => {} }))
    const { POST } = await import('./portal/auth/route')
    const res = await POST(new Request('https://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'send_code', phone: '+15551230000', tenant_slug: 'acme' }),
    }))
    expect(res.status).toBe(200)
    expect(rlOpts.get('portal_auth:+15551230000')?.failClosed).toBe(true)
  })
})

describe('pin-reset send_code', () => {
  it('opts the send_code throttle into failClosed', async () => {
    vi.doMock('next/headers', () => ({
      headers: async () => ({ get: (k: string) => ({ 'x-tenant-id': 'tenant-1', 'x-tenant-sig': 'sig' })[k] ?? null }),
    }))
    vi.doMock('@/lib/tenant-header-sig', () => ({ verifyTenantHeaderSig: () => true }))
    vi.doMock('@/lib/supabase', () => {
      function chain(table: string) {
        const c: Record<string, unknown> = {
          select: () => c,
          eq: () => c,
          ilike: () => c,
          delete: () => c,
          insert: async () => ({ data: null, error: null }),
          single: async () => {
            if (table === 'tenants') {
              return { data: { id: 'tenant-1', name: 'Acme', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'k' }, error: null }
            }
            return { data: null, error: null }
          },
          maybeSingle: async () => {
            if (table === 'tenant_members') {
              return { data: { id: 'member-1', name: 'A', phone: '+15551230000', email: 'a@x.com' }, error: null }
            }
            return { data: null, error: null }
          },
        }
        return c
      }
      return { supabaseAdmin: { from: (t: string) => chain(t) } }
    })
    vi.doMock('@/lib/email', () => ({ sendEmail: async () => {} }))
    const { POST } = await import('./pin-reset/route')
    const res = await POST(new Request('https://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'send_code', contact: '+15551230000' }),
    }))
    expect(res.status).toBe(200)
    expect(rlOpts.get('pin_reset:tenant-1:+15551230000')?.failClosed).toBe(true)
  })
})

describe('client/send-code', () => {
  it('opts the send-code throttle into failClosed', async () => {
    vi.doMock('@/lib/tenant-db', () => ({
      tenantDb: () => ({
        from: () => ({
          upsert: async () => ({ data: null, error: null }),
        }),
      }),
    }))
    vi.doMock('@/lib/tenant-site', () => ({
      getTenantFromHeaders: async () => ({ id: 'tenant-1', name: 'Acme', resend_api_key: 'k' }),
    }))
    vi.doMock('@/lib/email', () => ({ sendEmail: async () => {} }))
    vi.doMock('@/lib/sms', () => ({ sendSMS: async () => {} }))
    const { POST } = await import('./client/send-code/route')
    const res = await POST(new Request('https://x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'a@x.com' }),
    }))
    expect(res.status).toBe(200)
    expect(rlOpts.get('client-send-code:tenant-1:a@x.com')?.failClosed).toBe(true)
  })
})
