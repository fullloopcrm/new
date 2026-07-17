import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * POST /api/admin/send-apology-batch — SMS consent guard (P1/W2 fresh-ground,
 * broadened past the terminated-crew bug class to client-messaging consent).
 *
 * This route's opt-out check read `clients.sms_opt_in` -- the ORIGINAL
 * schema.sql column (default true), which nothing in the live codebase ever
 * writes after client creation. The two real opt-out writers are
 * `sms_marketing_opt_out` (set by /api/unsubscribe's link-click flow) and
 * `sms_consent` (set false by the Telnyx STOP-reply webhook) -- the exact
 * pair campaigns/send and campaigns/[id]/send already check. Because
 * `sms_opt_in` never moves off its `true` default, the skip branch here was
 * permanently dead: a client who texted STOP or clicked unsubscribe still
 * received the apology-credit SMS blast.
 *
 * FIX: check `sms_marketing_opt_out` / `sms_consent` instead of the dead
 * `sms_opt_in` field.
 */

const TENANT = 'tid-a'

const { sendSMS } = vi.hoisted(() => ({
  sendSMS: vi.fn(async (_opts: { to: string; body: string; telnyxApiKey: string; telnyxPhone: string }) => {}),
}))
vi.mock('@/lib/sms', () => ({ sendSMS }))
vi.mock('@/lib/require-permission', () => ({
  requirePermission: vi.fn(async () => ({ tenant: { tenantId: TENANT }, error: null })),
}))

const clientsHolder = vi.hoisted(() => ({
  rows: [] as {
    id: string
    name: string
    phone: string | null
    do_not_service?: boolean
    sms_consent?: boolean
    sms_marketing_opt_out?: boolean
  }[],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return { select: () => ({ eq: () => ({ single: async () => ({ data: { name: 'Acme', telnyx_api_key: 'key', telnyx_phone: '+15551234567' }, error: null }) }) }) }
      }
      if (table === 'clients') {
        return {
          select: () => ({ eq: () => ({ in: async () => ({ data: clientsHolder.rows, error: null }) }) }),
          update: () => ({ eq: () => ({ eq: async () => ({ data: null, error: null }) }) }),
        }
      }
      throw new Error(`unexpected table: ${table}`)
    },
  },
}))

import { POST } from './route'

function req(clientIds: string[]) {
  return new Request('http://t/api/admin/send-apology-batch', { method: 'POST', body: JSON.stringify({ client_ids: clientIds }) })
}

beforeEach(() => {
  sendSMS.mockClear()
  clientsHolder.rows = []
})

describe('POST /api/admin/send-apology-batch — SMS consent guard', () => {
  it('BLOCKED: a client who clicked unsubscribe (sms_marketing_opt_out) is not texted', async () => {
    clientsHolder.rows = [{ id: 'c-unsub', name: 'Unsub Client', phone: '+15559990001', sms_marketing_opt_out: true }]

    const res = await POST(req(['c-unsub']) as never)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(sendSMS).not.toHaveBeenCalled()
    expect(body.skipped_opt_out).toBe(1)
    expect(body.sent).toBe(0)
  })

  it('BLOCKED: a client who replied STOP (sms_consent=false) is not texted', async () => {
    clientsHolder.rows = [{ id: 'c-stop', name: 'Stop Client', phone: '+15559990002', sms_consent: false }]

    const res = await POST(req(['c-stop']) as never)
    const body = await res.json()
    expect(sendSMS).not.toHaveBeenCalled()
    expect(body.skipped_opt_out).toBe(1)
  })

  it('CONTROL: a client with no opt-out flags set is still texted', async () => {
    clientsHolder.rows = [{ id: 'c-active', name: 'Active Client', phone: '+15559990003' }]

    const res = await POST(req(['c-active']) as never)
    const body = await res.json()
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(body.sent).toBe(1)
    expect(body.skipped_opt_out).toBe(0)
  })

  it('MIXED: opted-out client silently dropped, consenting client still gets the blast', async () => {
    clientsHolder.rows = [
      { id: 'c-unsub', name: 'Unsub Client', phone: '+15559990001', sms_marketing_opt_out: true },
      { id: 'c-active', name: 'Active Client', phone: '+15559990003' },
    ]

    const res = await POST(req(['c-unsub', 'c-active']) as never)
    const body = await res.json()
    expect(sendSMS).toHaveBeenCalledTimes(1)
    expect(sendSMS.mock.calls[0][0]).toMatchObject({ to: '+15559990003' })
    expect(body.sent).toBe(1)
    expect(body.skipped_opt_out).toBe(1)
  })
})
