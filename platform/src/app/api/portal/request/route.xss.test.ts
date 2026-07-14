import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/portal/request is called by an AUTHENTICATED CLIENT (their own
 * portal token, verified via verifyPortalToken) -- an external party, lower
 * trust than any tenant staff member. Its notes/service_name/preferred_date
 * fields were interpolated raw into ownerAlert()'s bodyHtml, which the
 * shared helper (src/lib/messaging/owner-alerts.ts) documents as requiring
 * "Pre-escaped HTML body" -- this route didn't honor that contract. A client
 * submitting a portal request with a <script>/<img onerror> payload in
 * notes/service_name got it rendered raw when the tenant OWNER opened the
 * "New portal request" email -- stored XSS from an external client straight
 * into the owner's inbox.
 */

const TENANT_A = 'aaaaaaaa-0000-0000-0000-00000000000a'
const CLIENT_ID = 'client-1'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function updateChain(rows: Row[], values: Row) {
  const filters: Array<(r: Row) => boolean> = []
  const uc: Record<string, unknown> = {
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return uc },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => {
      rows.filter((r) => filters.every((f) => f(r))).forEach((r) => Object.assign(r, values))
      resolve({ data: null, error: null })
    },
  }
  return uc
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  const rowsOf = (): Row[] => DB[table] || (DB[table] = [])
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
  const c: Record<string, unknown> = {
    select: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    in: () => c,
    order: () => c,
    update: (values: Row) => updateChain(rowsOf(), values),
    insert: (row: Row) => { rowsOf().push({ id: `inserted-${rowsOf().length}`, ...row }); return { then: (resolve: (v: unknown) => unknown) => resolve({ data: null, error: null }) } },
    single: async () => ({ data: matched()[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: matched()[0] ?? null, error: null }),
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) => resolve({ data: matched(), error: null }),
  }
  return c
}

let capturedBodyHtml = ''

vi.mock('@/lib/tenant-db', () => ({ tenantDb: () => ({ from: (t: string) => chain(t) }) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: async (input: { bodyHtml: string }) => { capturedBodyHtml = input.bodyHtml },
}))

process.env.PORTAL_SECRET = 'unit-test-portal-secret'
import { NextRequest } from 'next/server'
import { createToken } from '@/app/api/portal/auth/token'
import { POST } from './route'

beforeEach(() => {
  capturedBodyHtml = ''
  DB.clients = [{ id: CLIENT_ID, tenant_id: TENANT_A, name: 'Client A' }]
  DB.deals = []
})

describe('POST /api/portal/request — bodyHtml is escaped', () => {
  it('does not render a raw <script> tag from a malicious service_name into the owner email', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/request', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ service_name: '<script>alert(document.cookie)</script>', notes: 'please help' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(capturedBodyHtml).not.toContain('<script>alert(document.cookie)</script>')
    expect(capturedBodyHtml).toContain('&lt;script&gt;')
  })

  it('does not render raw HTML from a malicious notes field into the owner email', async () => {
    const token = createToken(CLIENT_ID, TENANT_A)
    const req = new NextRequest('https://x/api/portal/request', {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ notes: '<img src=x onerror=alert(1)>' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(capturedBodyHtml).not.toContain('<img src=x onerror=')
    expect(capturedBodyHtml).toContain('&lt;img')
  })
})
