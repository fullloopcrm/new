import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createTenantDbHarness, type Harness } from '@/test/tenant-isolation-harness'

/**
 * GET /api/cron/phone-fixup — resolver-precedence bug-class probe.
 *
 * BUG (fixed here): below the existing website_url-first precedence, the
 * phone-fixup email link's base URL fell back to tenant.domain directly,
 * the legacy column only, never consulting tenant_domains. A tenant with no
 * website_url whose real custom domain lives only in tenant_domains (the
 * normal state — admin/websites writes tenant_domains only, never
 * tenants.domain) got its phone-fixup link built against the wrong host (or
 * the hardcoded nycmaid default), a link a real cleaner would land on the
 * wrong tenant's site or a 404. Fixed by resolving tenant_domains via
 * getPrimaryTenantDomain() before falling to tenants.domain — website_url's
 * existing top precedence is unchanged.
 */

const A = 'tid-phonefix-a'
const B = 'tid-phonefix-b'

const holder = vi.hoisted(() => ({ from: null as null | Harness['from'] }))
vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => holder.from!(t) } }))

const sendEmailMock = vi.hoisted(() => vi.fn(async (_to: string, _subject: string, _html: string) => ({ success: true })))
vi.mock('@/lib/nycmaid/email', () => ({ sendEmail: sendEmailMock }))

import { GET } from './route'

function seed() {
  return {
    tenants: [
      { id: A, name: 'Tenant A', domain: null, website_url: null, status: 'active' },
    ],
    cleaners: [
      { id: 'cln-1', tenant_id: A, name: 'Carla', email: 'carla@example.com', phone: '123', active: true },
    ],
    notifications: [] as Record<string, unknown>[],
    tenant_domains: [] as Record<string, unknown>[],
  }
}

let h: Harness
beforeEach(() => {
  process.env.CRON_SECRET = 'test-secret'
  process.env.ADMIN_PASSWORD = 'test-admin-password'
  h = createTenantDbHarness(seed())
  holder.from = h.from
  sendEmailMock.mockClear()
  sendEmailMock.mockResolvedValue({ success: true })
})

function req() {
  return new Request('http://t/api/cron/phone-fixup', {
    headers: { authorization: 'Bearer test-secret' },
  })
}

function sentLink(): string {
  const call = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1]
  const html = (call?.[2] as string | undefined) || ''
  return html.match(/href="([^"]*\/team\/update-phone\?token=[^"]*)"/)?.[1] || ''
}

describe('GET /api/cron/phone-fixup — domain-fallback bug-class probe', () => {
  it('domain-fallback: no website_url, tenants.domain is null, tenant_domains has an active PRIMARY row — uses that host', async () => {
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sentLink()).toContain('https://custom.example.com/team/update-phone')
  })

  it('falls back to tenants.domain when no active tenant_domains row exists', async () => {
    h.seed.tenants = [{ ...h.seed.tenants[0], domain: 'legacy.example.com' }]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sentLink()).toContain('https://legacy.example.com/team/update-phone')
  })

  it('website_url still wins over tenant_domains (existing precedence unchanged)', async () => {
    h.seed.tenants = [{ ...h.seed.tenants[0], website_url: 'https://via-website-url.example.com' }]
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'custom.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await GET(req())
    expect(res.status).toBe(200)
    expect(sentLink()).toContain('https://via-website-url.example.com/team/update-phone')
  })

  it("wrong-tenant probe: tenant B's tenant_domains row never leaks into tenant A's phone-fixup email", async () => {
    h.seed.tenants = [
      ...h.seed.tenants,
      { id: B, name: 'Tenant B', domain: null, website_url: null, status: 'active' },
    ]
    h.seed.cleaners = [
      ...h.seed.cleaners,
      { id: 'cln-2', tenant_id: B, name: 'Bea', email: 'bea@example.com', phone: '456', active: true },
    ]
    h.seed.tenant_domains = [
      { tenant_id: A, domain: 'a-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
      { tenant_id: B, domain: 'b-real.example.com', is_primary: true, active: true, created_at: '2024-01-01T00:00:00Z' },
    ]
    const res = await GET(req())
    expect(res.status).toBe(200)
    const links = sendEmailMock.mock.calls.map((c) => {
      const html = c[2] as string
      return html.match(/href="([^"]*\/team\/update-phone\?token=[^"]*)"/)?.[1] || ''
    })
    expect(links.some((l) => l.startsWith('https://a-real.example.com'))).toBe(true)
    expect(links.some((l) => l.startsWith('https://b-real.example.com'))).toBe(true)
    // Every emitted link resolves to exactly one of the two hosts — never a
    // cross-tenant mix (e.g. tenant A's cleaner sent tenant B's domain).
    expect(links.every((l) => l.startsWith('https://a-real.example.com') || l.startsWith('https://b-real.example.com'))).toBe(true)
  })
})
