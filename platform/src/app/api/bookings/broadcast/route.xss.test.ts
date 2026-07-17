import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * STORED-XSS-VIA-EMAIL — POST /api/bookings/broadcast.
 *
 * booking.notes and clients.address are FREE TEXT a client controls directly
 * (client/book's `body.notes`/`body.address` land in these columns with no
 * sanitization — that's by design, they're meant to be read as plain text by
 * a human admin). This route interpolated them raw into the "URGENT JOB
 * AVAILABLE" broadcast email sent to every active team member. Unlike the
 * self-XSS-only spots found elsewhere this pass (an applicant XSS'ing their
 * own inbox), this one has a real third-party victim: a client submits a
 * booking with a script-bearing notes field, an admin broadcasts that job,
 * and every team member who opens the email in an HTML-rendering mail
 * client executes the payload.
 */

const TENANT = 'tid-a'

const { sendSMS, notify } = vi.hoisted(() => ({
  sendSMS: vi.fn(async () => {}),
  notify: vi.fn(async (..._args: { message: string }[]) => {}),
}))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: () => 'sms' }))
vi.mock('@/lib/notify', () => ({ notify }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'rk', primary_color: null }, error: null }) }) }) }
      }
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({
                  data: {
                    id: 'bk-1',
                    tenant_id: TENANT,
                    start_time: '2026-08-01T10:00:00Z',
                    end_time: '2026-08-01T12:00:00Z',
                    pay_rate: 40,
                    service_type: 'Standard Clean',
                    notes: '<img src=x onerror=alert(document.cookie)>',
                    clients: { name: 'Client A', address: '123 Main St <script>alert(1)</script>' },
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }
      }
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ eq: async () => ({ data: [{ id: 'tm-1', name: 'Alex', phone: null, email: 'alex@example.com' }], error: null }) }) }) }
      }
      if (table === 'hr_employee_profiles') {
        return { select: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }) }) }
      }
      if (table === 'notifications') {
        return { insert: async () => ({ error: null }) }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req(body: Record<string, unknown>) {
  return new Request('http://t/api/bookings/broadcast', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  notify.mockClear()
})

describe('bookings/broadcast — HTML escaping of notes/address', () => {
  it('escapes booking.notes and client.address before building the team-member broadcast email', async () => {
    const res = await POST(req({ booking_id: 'bk-1' }))
    expect(res.status).toBe(200)
    expect(notify).toHaveBeenCalledTimes(1)
    const [{ message: html }] = notify.mock.calls[0]

    expect(html).not.toContain('<img src=x onerror=alert(document.cookie)>')
    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;img src=x onerror=alert(document.cookie)&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })
})
