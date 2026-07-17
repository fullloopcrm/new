import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/dashboard/comms-preview?send=... — fromEmail bug-class probe.
 *
 * Same bug/fix as documents/invoices/quotes [id]/send and
 * documents/public/[token]/sign: the ?send= dev-preview email's `from`
 * fallback (fires only when email_from is unset) was built from
 * `hello@${tenant.domain || 'fullloopcrm.com'}` — NOT a tenant_domains-
 * resolver-precedence gap, a distinct bug: a tenant's site domain is never
 * verified with Resend for SENDING (only tenants.email_from, paired with the
 * admin-configured tenants.resend_domain verification flow, is). Using any
 * resolved site domain here would break deliverability. Fixed via
 * tenantSender(), the established helper every other notify path already
 * routes through.
 */

const A = 'tid-a'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error { status = 401 },
  getTenantForRequest: vi.fn(async () => ({ userId: 'u1', tenantId: A, tenant: { id: A }, role: 'owner' })),
}))
const { sendEmail } = vi.hoisted(() => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))
vi.mock('@/lib/email', async () => {
  const actual = await vi.importActual<typeof import('@/lib/email')>('@/lib/email')
  return { ...actual, sendEmail }
})
vi.mock('@/lib/secret-crypto', () => ({ decryptSecret: (s: string) => s }))

import { GET } from './route'

function seed() {
  return {
    tenants: [
      {
        id: A, name: 'Acme', slug: 'acme', phone: null, email: null, address: null,
        logo_url: null, primary_color: null,
        resend_api_key: 'enc:resend', email_from: null,
      },
    ],
    tenant_domains: [] as Record<string, any>[],
  }
}

let h: Harness
beforeEach(() => {
  h = createTenantDbHarness(seed())
  holder.from = h.from
})

function get() {
  return GET(new Request('http://t/api/dashboard/comms-preview?send=payer@x.com'))
}

describe('GET /api/dashboard/comms-preview — fromEmail bug-class probe', () => {
  it('fromEmail uses tenantSender(): no email_from set — falls back to the tenant-identified platform apex, not fullloopcrm.com raw', async () => {
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe('Acme <acme@fullloopcrm.com>')
  })

  it('fromEmail uses tenant.email_from when set', async () => {
    h.seed.tenants[0].email_from = 'hello@acme-verified.com'
    const res = await get()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.from).toBe('hello@acme-verified.com')
  })
})
