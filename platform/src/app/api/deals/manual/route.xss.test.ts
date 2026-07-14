import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/deals/manual is reachable by ANY authenticated tenant member
 * (getTenantForRequest() only -- no requirePermission gate), including the
 * lowest-priv 'staff' role. Its name/phone/service fields were interpolated
 * raw into ownerAlert()'s bodyHtml (documented as requiring "Pre-escaped
 * HTML body"), so a low-priv staff member could inject a <script>/<img
 * onerror> payload via a manually-created lead that executes when the
 * tenant OWNER opens the "New lead" notification email -- stored XSS,
 * staff-to-owner privilege escalation vector.
 */

const TENANT = 'aaaaaaaa-0000-0000-0000-00000000000a'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: () => c,
    limit: () => c,
    insert: (row: Row) => {
      const created = { id: `new-${rowsOf().length + 1}`, ...row }
      rowsOf().push(created)
      return { select: () => ({ single: async () => ({ data: created, error: null }) }) }
    },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

let capturedBodyHtml = ''

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-query', () => ({
  getTenantForRequest: async () => ({ tenantId: TENANT, userId: 'staff-1', role: 'staff' }),
  AuthError: class AuthError extends Error {},
}))
vi.mock('@/lib/audit', () => ({ audit: async () => {} }))
vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: async (input: { bodyHtml: string }) => { capturedBodyHtml = input.bodyHtml },
}))

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://x/api/deals/manual', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  capturedBodyHtml = ''
  DB.clients = []
  DB.deals = []
  DB.deal_activities = []
})

describe('POST /api/deals/manual — owner-alert bodyHtml is escaped', () => {
  it('does not render a raw <script> tag from a malicious name into the owner email', async () => {
    const res = await POST(req({
      name: '<script>alert(document.cookie)</script>',
      phone: '5551234567',
      email: 'attacker@example.com',
    }))
    expect(res.status).toBe(200)
    expect(capturedBodyHtml).not.toContain('<script>alert(document.cookie)</script>')
    expect(capturedBodyHtml).toContain('&lt;script&gt;')
  })

  it('does not render raw HTML from a malicious service field into the owner email', async () => {
    const res = await POST(req({
      name: 'Real Name',
      phone: '5559876543',
      email: 'ok@example.com',
      service: '<img src=x onerror=alert(1)>',
    }))
    expect(res.status).toBe(200)
    expect(capturedBodyHtml).not.toContain('<img src=x onerror=')
    expect(capturedBodyHtml).toContain('&lt;img')
  })
})
