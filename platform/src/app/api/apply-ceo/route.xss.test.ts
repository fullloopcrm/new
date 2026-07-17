/**
 * STORED-XSS-VIA-EMAIL — POST /api/apply-ceo applicant confirmation.
 *
 * Public, unauthenticated founding-CEO application. `name` and `email` are
 * both caller-controlled, `email` with zero ownership check. When a tenant
 * opts into lead_confirmation_enabled, the route built the applicant
 * confirmation HTML with `name.split(' ')[0]` interpolated raw, unescaped,
 * and sent it to the caller-supplied `email` — an attacker can submit
 * name=<payload>, email=victim@example.com and land raw HTML in an arbitrary
 * third-party inbox. Same class already fixed on /api/leads, /api/contact,
 * /api/inquiry.
 */
import { describe, it, expect, vi } from 'vitest'

const rateLimitDb = vi.hoisted(() => vi.fn(async () => ({ allowed: true })))
vi.mock('@/lib/rate-limit-db', () => ({ rateLimitDb }))

const notify = vi.hoisted(() => vi.fn(async () => {}))
vi.mock('@/lib/notify', () => ({ notify }))

const sendEmail = vi.hoisted(() => vi.fn(async (..._args: { html: string }[]) => ({ id: 'email-1' })))
vi.mock('@/lib/email', () => ({ sendEmail }))

vi.mock('@/lib/tenant-site', () => ({
  getTenantFromHeaders: vi.fn(async () => ({
    id: 'tenant-1',
    name: 'Acme',
    selena_config: { lead_confirmation_enabled: true },
  })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: () => ({
      insert: () => ({
        select: () => ({
          single: () => Promise.resolve({ data: { id: 'app-1' }, error: null }),
        }),
      }),
    }),
  },
}))

import { POST } from './route'

// No spaces: the route greets by name.split(' ')[0], so a space-free payload
// survives the split intact and lands in the confirmation email whole.
const PAYLOAD = '<script>alert(document.cookie)</script>'

function ceoReq(): Request {
  const body = {
    name: PAYLOAD,
    email: 'attacker-controlled-victim@example.com',
    phone: '5551234567',
  }
  return new Request('http://acme.example.com/api/apply-ceo', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

describe('POST /api/apply-ceo — HTML escaping of applicant confirmation email', () => {
  it('escapes the caller-controlled name before building the confirmation email', async () => {
    const res = await POST(ceoReq())
    expect(res.status).toBe(200)
    expect(sendEmail).toHaveBeenCalledTimes(1)
    const [{ html }] = sendEmail.mock.calls[0]
    expect(html).not.toContain(PAYLOAD)
    expect(html).toContain('&lt;script&gt;alert(document.cookie)&lt;/script&gt;')
  })
})
