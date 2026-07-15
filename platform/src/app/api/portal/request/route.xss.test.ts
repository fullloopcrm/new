import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/portal/request.
 *
 * service_name / preferred_date / notes are free text a logged-in PORTAL
 * CLIENT (a customer, not staff) submits. They were interpolated verbatim
 * into ownerAlert's bodyHtml — raw HTML per OwnerAlertInput's contract, sent
 * straight to the tenant admin's inbox via emailAdmins(). A crafted request
 * from any portal client is a stored-XSS payload against the admin who reads
 * the alert — same class as the quotes/public/[token]/decline fix.
 */

const TENANT = 'tid-a'

const { ownerAlert } = vi.hoisted(() => ({
  ownerAlert: vi.fn(async (..._args: { bodyHtml: string }[]) => {}),
}))
vi.mock('@/lib/messaging/owner-alerts', () => ({ ownerAlert }))

vi.mock('../auth/token', () => ({
  verifyPortalToken: vi.fn(() => ({ id: 'cli-a', tid: TENANT })),
}))

const CLIENT = { id: 'cli-a', name: 'A Client' }

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({ single: async () => ({ data: CLIENT, error: null }) }),
            }),
          }),
        }
      }
      if (table === 'deals') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  order: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
                }),
              }),
            }),
          }),
          insert: async () => ({ data: null, error: null }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new NextRequest('http://t/api/portal/request', {
    method: 'POST',
    headers: { authorization: 'Bearer tok' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  ownerAlert.mockClear()
})

describe('portal/request POST — HTML escaping of client-supplied fields', () => {
  const PAYLOAD = '<script>alert(1)</script> and "quoted" \'attrs\' & ampersands'

  it('escapes service_name/preferred_date/notes before building ownerAlert bodyHtml', async () => {
    const res = await POST(req({ service_name: PAYLOAD, preferred_date: PAYLOAD, notes: PAYLOAD }))
    expect(res.status).toBe(200)
    expect(ownerAlert).toHaveBeenCalledTimes(1)
    const [{ bodyHtml }] = ownerAlert.mock.calls[0]
    expect(bodyHtml).not.toContain('<script>')
    expect(bodyHtml).not.toContain('"quoted"')
    expect(bodyHtml).not.toContain("'attrs'")
    expect(bodyHtml).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(bodyHtml).toContain('&quot;quoted&quot;')
    expect(bodyHtml).toContain('&#39;attrs&#39;')
  })
})
