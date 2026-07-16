import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { NextRequest } from 'next/server'

/**
 * POST /api/admin/send-apology-batch had NO duplicate-submit guard at all —
 * every call re-applied the apology credit and re-texted every selected
 * client, unconditionally. A double-click of "Send" (or a client-side retry
 * after a slow/timeout response) re-blasts the same discount-credit SMS to
 * every client in the batch again — same bug class as the find-cleaner
 * broadcast fix (45cbfdea) and the campaign-send fix (b229bd90), just never
 * swept for on this route. Fixed by claiming each client's
 * apology_credit_at atomically (unset or outside a 2-minute dedup window)
 * immediately before the SMS send — only the request whose conditional
 * UPDATE actually matches proceeds to text that client.
 */

const TENANT = 't-1'
const CLIENT_ID = 'c-1'

type Row = Record<string, unknown>
let client: Row
let tenantRow: Row

const sendSMS = vi.fn(async (_args: unknown) => ({ success: true }))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: TENANT }, error: null }),
}))
vi.mock('@/lib/tenant-query', () => ({
  AuthError: class AuthError extends Error {
    status: number
    constructor(message: string, status = 401) { super(message); this.status = status }
  },
}))
vi.mock('@/lib/sms', () => ({ sendSMS: (args: unknown) => sendSMS(args as never) }))

vi.mock('@/lib/supabase', () => {
  function tenantsChain() {
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { ...tenantRow }, error: null }) }) }) }
  }

  function clientsChain() {
    return {
      select: () => ({
        eq: () => ({
          in: async () => ({ data: [{ ...client }], error: null }),
        }),
      }),
      update: (payload: Row) => {
        const filters: Array<(r: Row) => boolean> = []
        const c: Record<string, unknown> = {
          eq: (col: string, val: unknown) => { filters.push((r) => r[col] === val); return c },
          is: (col: string) => { filters.push((r) => r[col] === null || r[col] === undefined); return c },
          lt: (col: string, val: unknown) => { filters.push((r) => typeof r[col] === 'string' && (r[col] as string) < (val as string)); return c },
          select: () => ({
            then: (resolve: (v: { data: unknown; error: null }) => void) => {
              const match = filters.every((f) => f(client))
              if (match) {
                Object.assign(client, payload)
                resolve({ data: [{ id: client.id }], error: null })
              } else {
                resolve({ data: [], error: null })
              }
            },
          }),
        }
        return c
      },
    }
  }

  const from = (table: string) => {
    if (table === 'tenants') return tenantsChain()
    if (table === 'clients') return clientsChain()
    throw new Error(`unexpected table ${table}`)
  }
  return { supabaseAdmin: { from } }
})

import { POST } from './route'

function req(): NextRequest {
  return new Request('http://localhost/api/admin/send-apology-batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_ids: [CLIENT_ID], credit_pct: 15, reason: 'Late arrival' }),
  }) as unknown as NextRequest
}

beforeEach(() => {
  sendSMS.mockClear()
  tenantRow = { name: 'Acme Cleaning', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }
  client = {
    id: CLIENT_ID,
    tenant_id: TENANT,
    name: 'Alice',
    phone: '+15559990000',
    do_not_service: false,
    sms_opt_in: true,
    apology_credit_at: null,
  }
})

describe('POST /api/admin/send-apology-batch — duplicate-submit race', () => {
  it('sends the apology SMS and applies the credit once', async () => {
    const res = await POST(req())
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.sent).toBe(1)
    expect(json.skipped_duplicate).toBe(0)
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(client.apology_credit_pct).toBe(15)
  })

  it('does not double-send when the batch is double-clicked (or retried) for the same client', async () => {
    const [r1, r2] = await Promise.all([POST(req()), POST(req())])
    const j1 = await r1.json()
    const j2 = await r2.json()
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    // Exactly one of the two calls should have won the claim and sent; the
    // other should report the duplicate skip, not a second send.
    expect(j1.sent + j2.sent).toBe(1)
    expect(j1.skipped_duplicate + j2.skipped_duplicate).toBe(1)
    expect(sendSMS).toHaveBeenCalledTimes(1)
  })
})
