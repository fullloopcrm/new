import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/pin-reset (action: send_code) is reachable pre-auth on a
 * tenant's own login page — the tenant is resolved from a signed header,
 * but the caller proves nothing about which member they are. `findMember`'s
 * email fallback passed `contact` straight into `.ilike('email', value)`
 * with no wildcard escaping, so a caller with no prior knowledge of any
 * specific member's email could supply '%'/'_' and use the
 * 'sent'/'No operator found' response as an existence oracle for which
 * member-email patterns exist on the tenant, instead of the endpoint only
 * ever confirming one already-known address. Same class already fixed on
 * /api/referrers (601a7904) and /api/client/check.
 *
 * This suite mocks `.ilike()` with real SQL-LIKE pattern semantics (the
 * existing verify-bruteforce.test.ts never exercises this branch — its
 * phone match always succeeds first) and asserts a wildcard/pattern no
 * longer matches, while the real member's exact email still does.
 */

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

const TENANT = 'tenant-1'
type Row = Record<string, unknown>
const members: Row[] = [
  { id: 'member-1', tenant_id: TENANT, name: 'Real Owner', phone: '+15559990000', email: 'owner@example.com' },
]

vi.mock('next/headers', () => ({
  headers: async () => ({ get: (k: string) => ({ 'x-tenant-id': TENANT, 'x-tenant-sig': 'sig' })[k] ?? null }),
}))
vi.mock('@/lib/tenant-header-sig', () => ({ verifyTenantHeaderSig: () => true }))
vi.mock('@/lib/admin-pin', () => ({
  hashAdminPin: (pin: string) => `hash:${pin}`,
  isValidAdminPin: (pin: string) => /^\d{4,8}$/.test(pin),
}))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: async () => ({ allowed: true, remaining: 5 }) }))
vi.mock('@/lib/sms', () => ({ sendSMS: async () => ({ ok: true }) }))
vi.mock('@/lib/email', () => ({ sendEmail: async () => ({ ok: true }) }))

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const filters: Array<(r: Row) => boolean> = []
    let single = false
    const rowsOf = (): Row[] => {
      if (table === 'tenants') return [{ id: TENANT, name: 'Acme', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'k' }]
      if (table === 'tenant_members') return members
      return []
    }
    const matched = (): Row[] => rowsOf().filter((r) => filters.every((f) => f(r)))
    const c: Record<string, unknown> = {
      select: () => c,
      eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
      ilike: (col: string, pattern: unknown) => {
        const re = likeToRegExp(String(pattern))
        filters.push((r) => re.test(String(r[col] ?? '')))
        return c
      },
      order: () => c,
      limit: () => c,
      neq: () => c,
      gt: () => c,
      delete: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }),
      insert: async () => ({ error: null }),
      update: () => ({ eq: async () => ({ error: null }) }),
      single: async () => ({ data: matched()[0] || null, error: matched()[0] ? null : { message: 'not found' } }),
      maybeSingle: async () => {
        const rows = matched()
        if (rows.length > 1) return { data: null, error: { message: 'multiple rows' } }
        return { data: rows[0] || null, error: null }
      },
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

import { POST } from './route'

function req(body: Record<string, unknown>): Request {
  return new Request('https://x', { method: 'POST', body: JSON.stringify(body) })
}

describe('POST /api/pin-reset send_code — ILIKE wildcard is neutralized', () => {
  it('does NOT find a member via a bare "%" wildcard contact', async () => {
    const res = await POST(req({ action: 'send_code', contact: '%' }))
    expect(res.status).toBe(404)
  })

  it('does NOT allow pattern-based enumeration via a trailing "%"', async () => {
    const res = await POST(req({ action: 'send_code', contact: 'owner%' }))
    expect(res.status).toBe(404)
  })

  it('still finds the real member by exact email (case-insensitive)', async () => {
    const res = await POST(req({ action: 'send_code', contact: 'OWNER@EXAMPLE.COM' }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.sent).toBe(true)
  })
})
