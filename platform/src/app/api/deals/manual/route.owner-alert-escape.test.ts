import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/deals/manual -- creating a manual lead fires ownerAlert() with the
 * submitted name/phone/service interpolated raw into `bodyHtml` (an HTML
 * sink; emailShell()'s contract requires callers to pre-escape, same as
 * every other ownerAlert() caller -- see the fix already applied to
 * /api/portal/request, commit 4f41d111). Any authenticated tenant member
 * with sales.edit could inject HTML/links into the owner-facing "new lead"
 * email via these fields.
 */

let clientInserts: Record<string, unknown>[] = []
let dealInserts: Record<string, unknown>[] = []
const ownerAlertCalls: Record<string, unknown>[] = []

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: 'tenant-1' }, error: null })),
}))
vi.mock('@/lib/audit', () => ({ audit: vi.fn(async () => {}) }))
vi.mock('@/lib/messaging/owner-alerts', () => ({
  ownerAlert: vi.fn(async (input: Record<string, unknown>) => {
    ownerAlertCalls.push(input)
  }),
}))

function genericChain(result: { data: unknown; error?: unknown }) {
  const q: Record<string, unknown> = {
    eq: () => q,
    ilike: () => q,
    limit: () => q,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    select: () => q,
    then: (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve),
  }
  return q
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => genericChain({ data: table === 'clients' ? [] : null }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'clients') {
          clientInserts.push(row)
          return { select: () => ({ single: () => Promise.resolve({ data: { id: 'new-client-1' }, error: null }) }) }
        }
        if (table === 'deals') {
          dealInserts.push(row)
          return {
            select: () => ({
              single: () => Promise.resolve({
                data: { id: 'deal-1', ...row, clients: { id: row.client_id, name: 'x' } },
                error: null,
              }),
            }),
          }
        }
        return { then: (resolve: (v: unknown) => void) => resolve({ error: null }) }
      },
    }),
  },
}))

import { POST } from './route'

const MALICIOUS_NAME = '<img src=x onerror=alert(1)>Attacker'
const MALICIOUS_PHONE = '<b>5551234567</b>'
const MALICIOUS_SERVICE = '<script>alert(2)</script>'

function req(): Request {
  const body = { name: MALICIOUS_NAME, phone: MALICIOUS_PHONE, email: 'attacker@evil.com', service: MALICIOUS_SERVICE }
  return { json: async () => body } as unknown as Request
}

describe('POST /api/deals/manual — ownerAlert bodyHtml/heading escaping', () => {
  beforeEach(() => {
    clientInserts = []
    dealInserts = []
    ownerAlertCalls.length = 0
  })

  it('escapes attacker-controlled name/phone/service before they reach the HTML email body', async () => {
    const res = await POST(req())

    expect(res.status).toBe(200)
    expect(ownerAlertCalls).toHaveLength(1)
    const { bodyHtml, heading } = ownerAlertCalls[0] as { bodyHtml: string; heading: string }

    expect(bodyHtml).not.toContain('<img src=x onerror=alert(1)>')
    expect(bodyHtml).not.toContain('<b>5551234567</b>')
    expect(bodyHtml).not.toContain('<script>alert(2)</script>')
    expect(bodyHtml).toContain('&lt;img src=x onerror=alert(1)&gt;Attacker')
    expect(bodyHtml).toContain('&lt;b&gt;5551234567&lt;/b&gt;')
    expect(bodyHtml).toContain('&lt;script&gt;alert(2)&lt;/script&gt;')
    expect(heading).not.toContain('<img src=x onerror=alert(1)>')
  })
})
