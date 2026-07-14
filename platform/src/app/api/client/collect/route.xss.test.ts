import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/client/collect.
 *
 * name/referrer_name/referrer_phone/src are free text an anonymous visitor
 * submits via a public collect form. Three separate notify() calls in this
 * file interpolated them raw into admin notifications ('referral_lead' x2,
 * 'new_client' x1) — none of those types have a dedicated HTML template in
 * notify.ts, so `message` becomes literal HTML via its fallback. Third-party
 * victim: the tenant admin reading the email.
 */

const { notify } = vi.hoisted(() => ({
  notify: vi.fn(async (..._args: { type: string; message: string }[]) => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/admin-contacts', () => ({ emailAdmins: vi.fn(async () => {}) }))
vi.mock('@/lib/attribution', () => ({ attributeCollectForm: vi.fn(async () => {}) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme' })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'clients') {
        return {
          select: () => ({ eq: () => ({ or: () => ({ limit: async () => ({ data: [], error: null }) }) }) }),
          insert: () => ({ select: () => ({ single: async () => ({ data: { id: 'c-1' }, error: null }) }) }),
        }
      }
      if (table === 'referrers') {
        return { select: () => ({ eq: () => ({ ilike: () => ({ eq: () => ({ limit: async () => ({ data: [], error: null }) }) }) }) }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/client/collect', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  notify.mockClear()
})

describe('client/collect/route.ts — HTML escaping across all 3 notify() sinks', () => {
  const PAYLOAD = '<img src=x onerror=alert(1)>'

  it('escapes name/referrer_name/referrer_phone in the referral_lead notify (phone branch)', async () => {
    const res = await POST(req({ name: PAYLOAD, phone: '5551234567', referrer_name: PAYLOAD, referrer_phone: '5559876543' }))
    expect(res.status).toBe(200)
    const referralCall = notify.mock.calls.find(([a]) => a.type === 'referral_lead')
    expect(referralCall).toBeTruthy()
    expect(referralCall![0].message).not.toContain(PAYLOAD)
    expect(referralCall![0].message).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })

  it('escapes name/src/referralInfo in the new_client notify', async () => {
    const res = await POST(req({ name: PAYLOAD, phone: '5551234567', src: PAYLOAD }))
    expect(res.status).toBe(200)
    const newClientCall = notify.mock.calls.find(([a]) => a.type === 'new_client')
    expect(newClientCall).toBeTruthy()
    expect(newClientCall![0].message).not.toContain(PAYLOAD)
    expect(newClientCall![0].message).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
