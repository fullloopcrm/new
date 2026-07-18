import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The phone-fixup cron's "confirm your number" email to cleaners built its
 * HTML via emailWrapper() with tenant.name and cleaner.name spliced in raw.
 * tenant.name is tenant-owner-controlled (dashboard onboarding), so a
 * malicious tenant name would execute in every eligible cleaner's inbox on
 * this cron's daily run. Same unescaped-tenant.name-in-HTML class already
 * fixed elsewhere this session — this cron route was missed.
 */

process.env.CRON_SECRET = 'test-cron-secret'
process.env.ADMIN_PASSWORD = 'test-admin-password'

const maliciousTenantName = '<img src=x onerror=alert(1)>'

type Row = Record<string, unknown>
const tenants: Row[] = [
  { id: 'tenant-1', name: maliciousTenantName, domain: null, website_url: 'https://example.com' },
]
const cleaners: Row[] = [
  { id: 'cleaner-1', name: 'Ana', email: 'ana@example.com', phone: 'not-a-real-phone' },
]

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ limit: async () => ({ data: tenants }) }) }) }
      }
      if (table === 'cleaners') {
        return { select: () => ({ eq: () => ({ eq: async () => ({ data: cleaners }) }) }) }
      }
      if (table === 'notifications') {
        return {
          select: () => ({ eq: () => ({ eq: () => ({ gte: async () => ({ data: [] }) }) }) }),
          insert: async () => ({ data: null, error: null }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    },
  },
}))

vi.mock('@/lib/nycmaid/phone-validator', () => ({
  validateUsPhone: () => ({ valid: false }),
}))

let lastHtml = ''
vi.mock('@/lib/nycmaid/email', () => ({
  sendEmail: vi.fn(async (_to: string, _subject: string, html: string) => {
    lastHtml = html
    return { success: true }
  }),
}))

import { GET } from './route'

beforeEach(() => {
  lastHtml = ''
})

describe('GET /api/cron/phone-fixup — HTML injection via tenant.name', () => {
  it('escapes an HTML-bearing tenant.name in the cleaner phone-confirmation email', async () => {
    const req = new Request('https://x', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })
    const res = await GET(req)
    expect(res.status).toBe(200)

    expect(lastHtml).not.toContain(maliciousTenantName)
    expect(lastHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
