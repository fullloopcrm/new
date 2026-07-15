import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Stored-XSS-via-email regression — portal/request/route.ts.
 * The client-portal "request service" form's notes/service_name/preferred_date
 * are attacker-controlled (any authenticated client) and land raw in the
 * "New portal request" HTML email sent to the tenant owner via ownerAlert's
 * bodyHtml (documented as "pre-escaped HTML" — the caller must escape).
 */

type Row = Record<string, unknown>
let store: Record<string, Row[]>

function matches(row: Row, eqs: Record<string, unknown>) {
  for (const [k, v] of Object.entries(eqs)) if (row[k] !== v) return false
  return true
}

function builder(table: string) {
  const eqs: Record<string, unknown> = {}
  let op: 'select' | 'insert' | 'update' = 'select'
  let payload: Row | null = null

  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: (col: string, val: unknown) => { eqs[col] = val; return chain },
    in: () => chain,
    order: () => chain,
    insert: (row: Row) => { op = 'insert'; payload = row; return chain },
    update: (values: Row) => { op = 'update'; payload = values; return chain },
    single: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      if (rows.length !== 1) return { data: null, error: { message: `Expected 1 row, got ${rows.length}` } }
      return { data: rows[0], error: null }
    },
    maybeSingle: async () => {
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      return { data: rows[0] ?? null, error: null }
    },
    then: (resolve: (v: { data: unknown; error: null }) => unknown) => {
      if (op === 'insert') {
        const inserted = { id: `new-${(store[table] || []).length + 1}`, ...(payload as Row) }
        store[table] = [...(store[table] || []), inserted]
        return resolve({ data: inserted, error: null })
      }
      if (op === 'update') {
        store[table] = (store[table] || []).map((r) => (matches(r, eqs) ? { ...r, ...(payload as Row) } : r))
        return resolve({ data: [], error: null })
      }
      const rows = (store[table] || []).filter((r) => matches(r, eqs))
      return resolve({ data: rows, error: null })
    },
  }
  return chain
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: { from: (table: string) => builder(table) },
}))

vi.mock('../auth/token', () => ({
  verifyPortalToken: (_token: string) => ({ id: 'client-a', tid: 'tenant-A' }),
}))

const ownerAlertCalls: Array<{ bodyHtml: string }> = []
vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: async (input: { bodyHtml: string }) => { ownerAlertCalls.push(input) },
}))

import { POST } from './route'

beforeEach(() => {
  store = {
    clients: [{ id: 'client-a', tenant_id: 'tenant-A', name: 'Alice' }],
    deals: [],
  }
  ownerAlertCalls.length = 0
})

function req(body: Record<string, unknown>): import('next/server').NextRequest {
  return new Request('http://x/api/portal/request', {
    method: 'POST',
    headers: { authorization: 'Bearer whatever' },
    body: JSON.stringify(body),
  }) as unknown as import('next/server').NextRequest
}

describe('portal/request POST — owner-alert HTML escaping', () => {
  it('escapes an XSS payload in notes before it reaches ownerAlert bodyHtml', async () => {
    const payload = '<img src=x onerror=alert(1)>'
    const res = await POST(req({ notes: payload }))
    expect(res.status).toBe(200)

    expect(ownerAlertCalls.length).toBe(1)
    const { bodyHtml } = ownerAlertCalls[0]
    expect(bodyHtml).not.toContain('<img src=x onerror=alert(1)>')
    expect(bodyHtml).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes an XSS payload in service_name and preferred_date too', async () => {
    const res = await POST(req({ service_name: '<script>alert(2)</script>', preferred_date: '"><svg onload=alert(3)>' }))
    expect(res.status).toBe(200)

    const { bodyHtml } = ownerAlertCalls[0]
    expect(bodyHtml).not.toContain('<script>alert(2)</script>')
    expect(bodyHtml).not.toContain('<svg onload=alert(3)>')
  })
})
