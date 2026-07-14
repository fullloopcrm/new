import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/portal/collect is unauthenticated by design (public "finish your
 * booking" lead-capture form). Its `referrer_name` field went straight into
 * `.ilike('name', \`%${referrer_name}%\`)` with no wildcard escaping — a
 * caller who supplies a raw '%' (e.g. referrer_name: '%') controls the ILIKE
 * pattern and matches ANY active referrer instead of one they actually know
 * the name of, letting an attacker with zero prior knowledge of any real
 * referrer force referral-credit misattribution onto an arbitrary referrer.
 * Same class as the fix already applied to /api/referrers, /api/client/check,
 * /api/pin-reset.
 *
 * Uses real SQL-LIKE pattern semantics (not a naive substring-after-stripping
 * '%' mock) so an unescaped wildcard is actually exercised, and inspects the
 * resulting client row's referrer_id directly (the route never echoes it back
 * in the response).
 */

const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'

type Row = Record<string, unknown>
const DB: Record<string, Row[]> = {}

function likeToRegExp(pattern: string): RegExp {
  let out = ''
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i]
    if (c === '\\' && i + 1 < pattern.length) {
      out += pattern[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    } else if (c === '%') {
      out += '.*'
    } else if (c === '_') {
      out += '.'
    } else {
      out += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${out}$`, 'i')
}

function chain(table: string) {
  const filters: Array<(r: Row) => boolean> = []
  let insertRow: Row | null = null
  const rowsOf = (): Row[] => DB[table] || []
  const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))

  const c: Record<string, unknown> = {
    select: () => c,
    insert: (row: Row) => {
      insertRow = row
      const created = { id: `new-${rowsOf().length + 1}`, ...row }
      DB[table] = [...rowsOf(), created]
      return c
    },
    update: () => c,
    eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
    ilike: (col: string, pattern: string) => {
      const re = likeToRegExp(pattern)
      filters.push((r) => re.test(String(r[col] ?? '')))
      return c
    },
    is: () => c,
    limit: () => c,
    single: async () => {
      if (insertRow) {
        const created = DB[table][DB[table].length - 1]
        return { data: created, error: null }
      }
      return { data: matched()[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
      resolve({ data: matched(), error: null }),
  }
  return c
}

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: { from: (t: string) => chain(t) } }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: async () => ({ id: TENANT, name: 'Canary', slug: 'canary' }),
  tenantSiteUrl: () => 'https://canary.example.com',
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 1 }) }))
vi.mock('@/lib/notify', () => ({ notify: async () => {} }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: async () => {} }))
vi.mock('@/lib/email-templates', () => ({ adminNewClientEmail: () => ({ subject: 's', html: 'h' }) }))
vi.mock('@/lib/error-tracking', () => ({ trackError: async () => {} }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: async () => {} }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => {} }))

import { NextRequest } from 'next/server'
import { POST } from './route'

function req(body: Record<string, unknown>): NextRequest {
  return new NextRequest('https://canary.example.com/api/portal/collect', {
    method: 'POST',
    headers: { 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  DB.clients = []
  DB.referrers = [{ id: 'ref-1', tenant_id: TENANT, name: 'Alice Adams', phone: '5551110000', active: true }]
  DB.portal_leads = []
  DB.notifications = []
})

describe('POST /api/portal/collect — referrer_name ILIKE wildcard is neutralized', () => {
  it('does NOT attribute a lead to a referrer when the caller sends a bare "%" wildcard', async () => {
    const res = await POST(req({ name: 'New Client', phone: '5559998888', referrer_name: '%' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const created = DB.clients.find((r) => r.id === body.client_id)
    expect(created?.referrer_id).toBeFalsy()
  })

  it('still matches the real referrer by partial name (legitimate substring search keeps working)', async () => {
    const res = await POST(req({ name: 'New Client', phone: '5559998889', referrer_name: 'Alice' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    const created = DB.clients.find((r) => r.id === body.client_id)
    expect(created?.referrer_id).toBe('ref-1')
  })
})
