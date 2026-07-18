import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * Portal auth — tenant_slug resolver-twin hardening.
 *
 * BUG (fixed here): this route hand-rolls its own `tenants.slug` lookup
 * instead of going through the shared resolver (tenant.ts/tenant-lookup.ts),
 * so it never inherited that resolver's `.toLowerCase()` normalization or its
 * maybeSingle()+explicit-error-check masked-error fix. A mixed-case
 * tenant_slug (any caller other than this route's own client, which
 * lowercases client-side before POSTing) silently 404'd "Business not found"
 * for a real, active tenant. Separately, `.single()` discarded its error, so
 * a genuine DB failure on the tenant lookup was indistinguishable from
 * "unknown business" — masking a real outage as a routine 404.
 */

const A = 'tid-a'
const B = 'tid-b'
const PHONE = '+15551234567'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({ sent: true })) }))
vi.mock('@/lib/email', () => ({ sendEmail: vi.fn(async () => ({ sent: true })) }))

process.env.PORTAL_SECRET = 'test-portal-secret'

import { POST } from './route'

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness({
    tenants: [
      { id: A, slug: 'tenant-a', status: 'active', name: 'Tenant A', telnyx_api_key: 'k', telnyx_phone: '+15550000000' },
    ],
    clients: [{ id: 'client-a', tenant_id: A, name: 'Alice', phone: PHONE, email: 'alice@example.com' }],
    portal_auth_codes: [],
  })
  holder.from = h.from
})

function req(body: unknown): Request {
  return { json: async () => body } as unknown as Request
}

describe('portal auth send_code — tenant_slug case normalization', () => {
  it('resolves a mixed-case tenant_slug to the same (lowercase-stored) tenant', async () => {
    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'Tenant-A' }))
    expect(res.status).toBe(200)
  })

  it('an unknown slug (even case-correct) still 404s — not a false positive', async () => {
    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'no-such-tenant' }))
    expect(res.status).toBe(404)
    expect((await res.json()).error).toBe('Business not found')
  })

  it('wrong-tenant probe: normalizing case never resolves a slug to a DIFFERENT tenant', async () => {
    // Two tenants whose slugs differ only by a segment, so a naive/broken
    // normalization (e.g. stripping instead of lowercasing) could plausibly
    // collide them. Confirm mixed-case "Tenant-A" resolves to tenant A only.
    h.seed.tenants.push({ id: B, slug: 'tenant-ab', status: 'active', name: 'Tenant AB', telnyx_api_key: 'k', telnyx_phone: '+15550000002' })
    h.seed.clients.push({ id: 'client-b', tenant_id: B, name: 'Bo', phone: PHONE, email: 'bo@example.com' })

    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'Tenant-A' }))
    expect(res.status).toBe(200)

    // The code + rate-limit bucket must be scoped to tenant A, not B.
    expect(h.seed.portal_auth_codes.some((c) => c.tenant_id === A)).toBe(true)
    expect(h.seed.portal_auth_codes.some((c) => c.tenant_id === B)).toBe(false)
  })
})

describe('portal auth verify_code — tenant_slug case normalization', () => {
  beforeEach(() => {
    h.seed.portal_auth_codes.push({
      id: 'code-a', tenant_id: A, client_id: 'client-a', phone: PHONE, code: '111111',
      used: false, expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), created_at: new Date().toISOString(),
    })
  })

  it('resolves a mixed-case tenant_slug and completes verification', async () => {
    const res = await POST(req({ action: 'verify_code', phone: PHONE, code: '111111', tenant_slug: 'TENANT-A' }))
    expect(res.status).toBe(200)
    expect(typeof (await res.json()).token).toBe('string')
  })
})

describe('portal auth — masked tenant-lookup DB error surfaces loud, not as a false 404', () => {
  it('send_code: a genuine tenant-lookup failure returns 500, not "Business not found"', async () => {
    holder.from = (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }) }),
            }),
          }),
        }
      }
      return h.from(table)
    }

    const res = await POST(req({ action: 'send_code', phone: PHONE, tenant_slug: 'tenant-a' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toBe('Business not found')
  })

  it('verify_code: a genuine tenant-lookup failure returns 500, not "Business not found"', async () => {
    holder.from = (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'connection reset' } }) }),
            }),
          }),
        }
      }
      return h.from(table)
    }

    const res = await POST(req({ action: 'verify_code', phone: PHONE, code: '111111', tenant_slug: 'tenant-a' }))
    expect(res.status).toBe(500)
    expect((await res.json()).error).not.toBe('Business not found')
  })
})
