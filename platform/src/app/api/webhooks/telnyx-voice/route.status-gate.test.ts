import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * /api/webhooks/telnyx-voice — tenantServesSite() status gate.
 *
 * Same bug class as every other slug/host/phone-resolved entry point fixed
 * this session (PIN-login, portal/team-portal auth tokens, public site
 * header resolver, per-tenant Telegram webhook, Telnyx inbound-SMS webhook):
 * this route is hardcoded to NYCMAID_TENANT_ID and never checked that
 * tenant's status before ringing admins, creating comhub_active_calls/
 * comhub_messages rows, and sending missed-call SMS. Inbound voice delivery
 * has no dependency on the tenant's site/dashboard being reachable.
 */

const sendSMS = vi.fn(async (..._args: unknown[]) => ({ success: true }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: (...args: unknown[]) => sendSMS(...args) }))

let tenantStatus: string | null = null
const rpc = vi.fn(async (name: string) => {
  if (name === 'comhub_get_or_create_contact_by_phone') return { data: 'contact1', error: null }
  if (name === 'comhub_get_or_create_thread') return { data: 'thread1', error: null }
  return { data: null, error: null }
})

function chainable(result: unknown = { data: null, error: null }) {
  const obj: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'gte', 'order', 'limit', 'update', 'insert', 'or']
  for (const m of methods) obj[m] = vi.fn(() => obj)
  obj.single = vi.fn(async () => result)
  obj.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve)
  return obj
}

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({ single: () => Promise.resolve({ data: { status: tenantStatus }, error: null }) }),
          }),
        }
      }
      if (table === 'comhub_admin_presence') {
        return chainable({ data: [] })
      }
      if (table === 'comhub_messages') {
        return {
          insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: 'msg1' }, error: null }) }) }),
        }
      }
      return chainable()
    },
    rpc,
  },
}))

function req(body: object): Request {
  const rawBody = JSON.stringify(body)
  return {
    text: async () => rawBody,
    headers: { get: () => null },
  } as unknown as Request
}

function callInitiatedPayload() {
  return {
    data: {
      event_type: 'call.initiated',
      payload: {
        call_control_id: 'call1',
        call_session_id: 'sess1',
        from: '+15551234567',
        to: '+18883164019',
        direction: 'incoming',
      },
    },
  }
}

beforeEach(() => {
  vi.resetModules()
  rpc.mockClear()
  sendSMS.mockClear()
})

describe('telnyx-voice webhook — tenantServesSite() status gate', () => {
  it.each(['suspended', 'cancelled', 'deleted'])(
    'skips a %s nycmaid tenant without touching call/contact/thread state',
    async (status) => {
      tenantStatus = status
      const { POST } = await import('./route')
      const res = await POST(req(callInitiatedPayload()) as unknown as import('next/server').NextRequest)
      const body = await res.json()

      expect(body).toEqual({ ok: true, skip: 'tenant_not_active' })
      expect(rpc).not.toHaveBeenCalled()
    },
  )

  it.each(['active', 'setup', 'pending'])('still processes a %s nycmaid tenant', async (status) => {
    tenantStatus = status
    const { POST } = await import('./route')
    const res = await POST(req(callInitiatedPayload()) as unknown as import('next/server').NextRequest)
    const body = await res.json()

    expect(body.skip).not.toBe('tenant_not_active')
    expect(rpc).toHaveBeenCalledWith('comhub_get_or_create_contact_by_phone', expect.anything())
  })
})
