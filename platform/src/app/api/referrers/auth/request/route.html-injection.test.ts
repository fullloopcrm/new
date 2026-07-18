import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/referrers/auth/request builds its own ad-hoc login-code email,
 * splicing tenant.name (text content) and tenant.primary_color (a
 * `style="color:${color}"` CSS-declaration context) into the HTML sent to a
 * referrer. Both are tenant self-serve free text with no format enforcement,
 * so a malicious tenant could target a real referrer's inbox — a third
 * party, not the tenant themselves.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-000000000002'
const REFERRER = '11111111-0000-0000-0000-000000000002'
const EMAIL = 'partner@example.com'

type Row = Record<string, unknown>

let tenantRow: Row

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const c: Record<string, unknown> = {
      select: () => c,
      update: () => c,
      eq: () => c,
      ilike: () => c,
      single: async () => {
        if (table === 'tenants') return { data: tenantRow, error: null }
        return { data: null, error: null }
      },
      maybeSingle: async () => {
        if (table === 'referrers') return { data: { id: REFERRER, name: 'Partner', email: EMAIL }, error: null }
        return { data: null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))

const emailSends: Array<{ html?: string; subject?: string }> = []
vi.mock('@/lib/email', () => ({
  sendEmail: async (a: { html?: string; subject?: string }) => { emailSends.push(a); return {} },
}))

import { NextRequest } from 'next/server'
import { POST } from './route'

function req(): NextRequest {
  return new NextRequest('https://canary.example.com/api/referrers/auth/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL }),
  })
}

beforeEach(() => {
  process.env.TEAM_PORTAL_SECRET = 'unit-test-team-portal-secret'
  emailSends.length = 0
  tenantRow = { name: 'Canary', primary_color: '#0d9488', resend_api_key: null, resend_domain: null }
})

describe('POST /api/referrers/auth/request — tenant-controlled brand fields', () => {
  it('rejects a malformed primary_color instead of splicing it raw into the style attribute', async () => {
    tenantRow.primary_color = 'red;position:fixed;top:0;left:0;width:100%;height:100%;background:url(https://evil.example/track.gif)'

    const res = await POST(req())
    expect(res.status).toBe(200)

    expect(emailSends).toHaveLength(1)
    const html = emailSends[0].html || ''
    expect(html).not.toContain('position:fixed')
    expect(html).not.toContain('evil.example')
    expect(html).toContain('color:#0d9488')
  })

  it('escapes an attribute-breakout payload in tenant.name', () => {
    tenantRow.name = `Canary" onmouseover="alert(1)`
    return POST(req()).then(async (res) => {
      expect(res.status).toBe(200)
      const html = emailSends[0].html || ''
      expect(html).not.toContain('onmouseover="alert(1)"')
      expect(html).toContain('&quot;')
    })
  })
})
