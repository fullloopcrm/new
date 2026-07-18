import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * codeEmailHtml() spliced tenant.name raw into the client verification-code
 * email's <h2>. tenant.name is tenant-owner-controlled (dashboard
 * onboarding), and this route is reachable pre-auth (client verification
 * code request), so a malicious tenant name would execute in every client's
 * mail client on every login/verification attempt. Same unescaped-
 * tenant.name-in-HTML class already fixed elsewhere this session — this
 * route was missed.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const maliciousTenantName = '<img src=x onerror=alert(1)>'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  let upsertRow: Row | null = null
  const c: Record<string, unknown> = {
    upsert: (row: Row) => { upsertRow = row; return c },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      if (upsertRow) {
        const rows = DB[table] || (DB[table] = [])
        rows.push({ ...upsertRow })
      }
      return resolve({ data: null, error: null })
    },
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))

const tenantCtx: Row = { id: TENANT_A, name: maliciousTenantName, resend_api_key: 'key' }
vi.mock('@/lib/tenant-site', () => ({ getTenantFromHeaders: async () => tenantCtx }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

let lastEmailHtml = ''
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn(async (args: { html: string }) => {
    lastEmailHtml = args.html
  }),
}))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  DB.verification_codes = []
  lastEmailHtml = ''
})

describe('POST /api/client/send-code — HTML injection via tenant.name', () => {
  it('escapes an HTML-bearing tenant.name in the verification-code email', async () => {
    const res = await POST(req({ email: 'client@example.com' }))
    expect(res.status).toBe(200)

    expect(lastEmailHtml).not.toContain(maliciousTenantName)
    expect(lastEmailHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
