import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 file-only fix verification: the one-tap terms-confirm flow hardcoded the
 * word "cleaner" in the client SMS, the admin SMS, and the admin notification —
 * cleaning-vocabulary leaking into a global (all-trades) route. Fixed to
 * trade-neutral wording ("service pro" / "team member").
 */

const TOKEN = 'tok_abc123'
const TENANT = 'aaaaaaaa-1111-2222-3333-444444444444'
const BOOKING_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

type Row = Record<string, unknown>

const bookingRow = {
  id: BOOKING_ID,
  tenant_id: TENANT,
  start_time: '2026-08-14T10:00:00Z',
  status: 'pending',
  client_terms_accepted_at: null,
  client_id: 'client-1',
  clients: { name: 'Jamie Client', phone: '+15551234567' },
}

vi.mock('@/lib/supabase', () => {
  function chain(table: string) {
    const eqs: Row = {}
    let selectCols = ''
    const c: Record<string, unknown> = {
      select: (cols?: string) => { selectCols = cols || ''; return c },
      update: (_p: Row) => c,
      eq: (col: string, val: unknown) => { eqs[col] = val; return c },
      maybeSingle: async () => {
        if (table === 'bookings' && eqs.client_confirm_token === TOKEN) {
          return { data: bookingRow, error: null }
        }
        return { data: null, error: null }
      },
      single: async () => {
        if (table === 'bookings' && selectCols === 'notes') {
          return { data: { notes: '' }, error: null }
        }
        return { data: null, error: null }
      },
      then: (res: (v: { data: unknown; error: unknown }) => unknown) => res({ data: null, error: null }),
    }
    return c
  }
  return { supabaseAdmin: { from: (t: string) => chain(t) } }
})

const clientSms: string[] = []
const adminSms: string[] = []
const notifyMessages: string[] = []

vi.mock('@/lib/nycmaid/sms', () => ({
  sendSMS: async (_to: string, message: string) => { clientSms.push(message); return { success: true } },
}))
vi.mock('@/lib/admin-contacts', () => ({
  smsAdmins: async (_tenantId: string, message: string) => { adminSms.push(message) },
}))
vi.mock('@/lib/nycmaid/notify', () => ({
  notify: async (opts: { message: string }) => { notifyMessages.push(opts.message) },
}))

import { POST } from '@/app/api/client/confirm/[token]/route'

describe('POST /api/client/confirm/[token] — trade-neutral wording', () => {
  beforeEach(() => {
    clientSms.length = 0
    adminSms.length = 0
    notifyMessages.length = 0
  })

  it('never says "cleaner" in the client SMS, admin SMS, or admin notification', async () => {
    const res = await POST(new Request('https://example.com/api/client/confirm/' + TOKEN, { method: 'POST' }), {
      params: Promise.resolve({ token: TOKEN }),
    })
    expect(res.status).toBe(200)

    expect(clientSms).toHaveLength(1)
    expect(clientSms[0]).not.toMatch(/cleaner/i)

    expect(adminSms).toHaveLength(1)
    expect(adminSms[0]).not.toMatch(/cleaner/i)

    expect(notifyMessages).toHaveLength(1)
    expect(notifyMessages[0]).not.toMatch(/cleaner/i)
  })
})
