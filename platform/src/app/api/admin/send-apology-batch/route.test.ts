import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * TCPA regression for the SMS opt-out bug in the apology batch.
 *
 * Before: the batch read clients.sms_opt_in, a DEAD column that stays at its
 * default `true`. Real opt-outs are written to the CANONICAL clients.sms_consent
 * (migrations 007/013) — inbound STOP via webhooks/telnyx sets sms_consent=false.
 * So a client who texted STOP still got an apology SMS. TCPA violation.
 * After: the guard reads sms_consent, so opted-out clients are skipped.
 */

const h = vi.hoisted(() => ({
  clients: [] as Array<Record<string, unknown>>,
  sentTo: [] as string[],
}))

vi.mock('@/lib/require-permission', () => ({
  requirePermission: async () => ({ tenant: { tenantId: 't1' }, error: null }),
}))

vi.mock('@/lib/sms', () => ({
  sendSMS: async ({ to }: { to: string }) => {
    h.sentTo.push(to)
    return { ok: true }
  },
}))

// Chainable Supabase stub. tenants.single() returns Telnyx creds so the send
// path is exercised. The clients SELECT chain (terminating in .in()) is awaited
// directly and resolves to the fixture; the clients UPDATE chain resolves empty.
vi.mock('@/lib/supabase', () => {
  const build = (table: string) => {
    const state = { isUpdate: false }
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'order', 'neq', 'gte', 'ilike', 'insert']) {
      b[m] = () => b
    }
    b.update = () => {
      state.isUpdate = true
      return b
    }
    b.single = async () =>
      table === 'tenants'
        ? {
            data: { name: 'Test Co', telnyx_api_key: 'key_test', telnyx_phone: '+10000000000' },
            error: null,
          }
        : { data: null, error: null }
    // Thenable so `await ...chain` resolves without a terminal .single().
    b.then = (resolve: (v: unknown) => unknown) =>
      resolve(
        table === 'clients' && !state.isUpdate
          ? { data: h.clients, error: null }
          : { data: null, error: null }
      )
    return b
  }
  return { supabaseAdmin: { from: (t: string) => build(t) } }
})

import { POST } from './route'

function postBatch(clientIds: string[]) {
  const req = new Request('http://localhost/api/admin/send-apology-batch', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ client_ids: clientIds, credit_pct: 10 }),
  })
  return POST(req as never)
}

const OPTED_OUT_PHONE = '+15551112222'
const CONSENTING_PHONE = '+15553334444'

describe('send-apology-batch — TCPA opt-out guard', () => {
  beforeEach(() => {
    h.clients = [
      { id: 'c-optout', name: 'Opted Out', phone: OPTED_OUT_PHONE, do_not_service: false, sms_consent: false },
      { id: 'c-ok', name: 'Happy Client', phone: CONSENTING_PHONE, do_not_service: false, sms_consent: true },
    ]
    h.sentTo = []
  })

  it('does NOT text a client who opted out (sms_consent=false)', async () => {
    const res = await postBatch(['c-optout', 'c-ok'])
    const json = await res.json()

    // The opted-out client's phone must never be handed to sendSMS.
    expect(h.sentTo).not.toContain(OPTED_OUT_PHONE)
    // The consenting client still gets the apology.
    expect(h.sentTo).toContain(CONSENTING_PHONE)

    expect(json.sent).toBe(1)
    expect(json.skipped_opt_out).toBe(1)
  })
})
