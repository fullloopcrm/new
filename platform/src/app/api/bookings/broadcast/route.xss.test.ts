import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * POST /api/bookings/broadcast builds its own ad-hoc HTML email (not one of
 * the escapeHtml-wrapped templates in lib/email-templates.ts) embedding the
 * booking's client.address / service_type / notes verbatim, then sends it to
 * every active team member via notify(). Those fields trace back to public,
 * unauthenticated /api/client/book submissions, so a malicious client name/
 * address/notes planted at booking time renders unescaped HTML in a real
 * team member's inbox once staff triggers the broadcast — a stored HTML
 * injection into a third party's inbox, not merely the submitter's own.
 */

const TENANT = 'tenant-1'
const MEMBER = 'member-1'
const BOOKING = 'booking-1'

const PAYLOAD = '<img src=x onerror=alert(1)>'

let bookingRow: Record<string, unknown>
let notifyMock: ReturnType<typeof vi.fn<(args: unknown) => void>>
let tenantPrimaryColor: string

vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn((table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: null, telnyx_phone: null, resend_api_key: 'rk_1', primary_color: tenantPrimaryColor } }) }) }) }
      }
      if (table === 'bookings') {
        return { select: () => ({ eq: () => ({ eq: () => ({ single: async () => ({ data: bookingRow }) }) }) }) }
      }
      if (table === 'team_members') {
        return { select: () => ({ eq: () => ({ eq: async () => ({ data: [{ id: MEMBER, name: 'Sam', phone: null, email: 'sam@example.com' }] }) }) }) }
      }
      if (table === 'notifications') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null }),
                    }),
                  }),
                }),
              }),
            }),
          }),
          insert: async () => ({ data: null }),
        }
      }
      throw new Error(`unexpected table ${table}`)
    }),
  },
}))

vi.mock('@/lib/sms', () => ({ sendSMS: vi.fn(async () => ({})) }))
vi.mock('@/lib/sms-templates', () => ({ smsUrgentBroadcast: vi.fn(() => 'sms body') }))

vi.mock('@/lib/notify', () => ({
  notify: vi.fn(async (args: unknown) => {
    notifyMock(args)
    return { success: true }
  }),
}))

beforeEach(() => {
  notifyMock = vi.fn()
  tenantPrimaryColor = '#000'
  bookingRow = {
    id: BOOKING,
    start_time: '2026-08-01T14:00:00Z',
    end_time: '2026-08-01T16:00:00Z',
    pay_rate: 45,
    service_type: PAYLOAD,
    notes: PAYLOAD,
    clients: { name: 'Attacker', address: PAYLOAD },
  }
})

describe('POST /api/bookings/broadcast — HTML injection via booking fields', () => {
  it('escapes client.address, service_type, and notes before embedding them in the team-member email HTML', async () => {
    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/bookings/broadcast', {
      method: 'POST',
      body: JSON.stringify({ booking_id: BOOKING }),
    }))
    expect(res.status).toBe(200)

    expect(notifyMock).toHaveBeenCalledTimes(1)
    const call = notifyMock.mock.calls[0][0] as { message: string }
    expect(call.message).not.toContain(PAYLOAD)
    expect(call.message).not.toContain('<img')
    expect(call.message).toContain('&lt;img')
  })

  it('rejects a malformed tenant primary_color instead of splicing it raw into the style attribute', async () => {
    // primary_color is tenant self-serve free text with no format
    // enforcement. Unlike client.address/service_type/notes above (text
    // content, fixed by HTML-escaping), this lands directly inside a
    // `style="background: ${color}"` CSS-declaration context — a
    // semicolon-delimited payload doesn't even need a quote to smuggle in
    // extra CSS declarations, so escaping alone wouldn't close this off.
    tenantPrimaryColor = 'red;position:fixed;top:0;left:0;width:100%;height:100%;background:url(https://evil.example/track.gif)'

    const { POST } = await import('./route')
    const res = await POST(new Request('http://x/api/bookings/broadcast', {
      method: 'POST',
      body: JSON.stringify({ booking_id: BOOKING }),
    }))
    expect(res.status).toBe(200)

    const call = notifyMock.mock.calls[0][0] as { message: string }
    expect(call.message).not.toContain('position:fixed')
    expect(call.message).not.toContain('evil.example')
    expect(call.message).toContain('background: #dc2626')
  })
})
