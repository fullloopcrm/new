import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/apply (public team/stylist application).
 *
 * name/specialty/position/experience are free text an anonymous applicant
 * types on a tenant's public careers page. They were interpolated raw into
 * the "New Team Application" admin notify() message — type 'cleaner_application'
 * has no dedicated HTML template in notify.ts, so its `message` becomes
 * literal HTML via notify.ts's fallback. Third-party victim: the tenant admin.
 */

const { notify } = vi.hoisted(() => ({
  notify: vi.fn(async (..._args: { message: string }[]) => ({ success: true })),
}))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb: vi.fn(async () => ({ allowed: true })) }))
vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({ id: 'tid-a', name: 'Acme' })),
}))
vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({ single: async () => ({ data: { id: 'app-1' }, error: null }) }),
      }),
    }),
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/apply', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  notify.mockClear()
})

describe('apply/route.ts — HTML escaping of applicant fields', () => {
  const PAYLOAD = '<img src=x onerror=alert(1)>'

  it('escapes name/specialty/experience before building the admin notify() message', async () => {
    const res = await POST(req({ name: PAYLOAD, phone: '5551234567', specialty: PAYLOAD, experience: PAYLOAD }))
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    const [{ message }] = notify.mock.calls[0]
    expect(message).not.toContain(PAYLOAD)
    expect(message).toContain('&lt;img src=x onerror=alert(1)&gt;')
  })
})
