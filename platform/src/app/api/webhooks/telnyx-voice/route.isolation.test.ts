import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'

/**
 * W4 independent isolation regression for the Telnyx VOICE webhook (fix a7614f7).
 *
 * The sibling file route.test.ts covers unsigned/forged/no-key rejection and
 * unknown/ambiguous DID handling (the DID cases run with verification turned
 * OFF). This file proves two COMPLEMENTARY properties from the verification lane
 * that the sibling does not:
 *
 *   1. REPLAY DEFENSE: a webhook signed with a genuinely valid Ed25519 signature
 *      but a STALE timestamp (older than the 5-minute window) is REJECTED (401)
 *      and records nothing. A captured-and-replayed event must not drive the
 *      dial/record/voicemail flow.
 *   2. INDEPENDENT GATES: the signature check and the tenant check are separate
 *      gates. A request with a VALID signature over an UNKNOWN-DID payload still
 *      404s and records nothing — passing signature verification does NOT imply
 *      passing tenant resolution, so an authenticated-but-wrong-DID call cannot
 *      cross-route into another tenant.
 */

const NYCMAID_DID = '+18883164019'

// Same chainable, insert-capturing Supabase stub shape as the sibling test.
const mock = vi.hoisted(() => {
  const state: { tenantRows: Array<{ id: string; name: string }>; inserts: Array<{ table: string; row: unknown }> } = {
    tenantRows: [],
    inserts: [],
  }
  function makeChain(table: string) {
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (row: unknown) => {
        state.inserts.push({ table, row })
        return chain
      },
      update: () => chain,
      eq: () => chain,
      or: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: async () =>
        table === 'tenants' ? { data: state.tenantRows, error: null } : { data: [], error: null },
      single: async () =>
        table === 'comhub_messages' ? { data: { id: 'msg-1' }, error: null } : { data: null, error: null },
      then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
    }
    return chain
  }
  const supabaseAdmin = {
    from: (table: string) => makeChain(table),
    rpc: async (fn: string) => {
      if (fn === 'comhub_get_or_create_contact_by_phone') return { data: 'contact-1', error: null }
      if (fn === 'comhub_get_or_create_thread') return { data: 'thread-1', error: null }
      return { data: null, error: null }
    },
  }
  return { state, supabaseAdmin }
})

vi.mock('@/lib/supabase', () => ({ supabaseAdmin: mock.supabaseAdmin }))
vi.mock('@/lib/nycmaid/sms', () => ({ sendSMS: vi.fn(async () => ({ success: true })) }))

import { POST } from './route'

const { privateKey, publicKey } = generateKeyPairSync('ed25519')
const spki = publicKey.export({ format: 'der', type: 'spki' }) as Buffer
const RAW_PUB = spki.subarray(spki.length - 32).toString('base64')

function makeRequest(body: string, headers: Record<string, string>): Request {
  return new Request('http://localhost/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers: new Headers(headers),
    body,
  })
}

// Sign for an explicit timestamp (seconds) so we can forge a stale one.
function signedHeadersAt(body: string, tsSeconds: number): Record<string, string> {
  const ts = String(tsSeconds)
  const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
  return { 'telnyx-timestamp': ts, 'telnyx-signature-ed25519': sig }
}

function inboundCall(to: string): string {
  return JSON.stringify({
    data: {
      event_type: 'call.initiated',
      payload: { call_control_id: 'cc-1', from: '+15551234567', to, direction: 'incoming' },
    },
  })
}

beforeEach(() => {
  mock.state.tenantRows = []
  mock.state.inserts = []
  process.env.TELNYX_PUBLIC_KEY = RAW_PUB
  delete process.env.TELNYX_WEBHOOK_VERIFY
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data: {} }), text: async () => '' })),
  )
})

describe('telnyx-voice — replay defense (stale timestamp)', () => {
  it('rejects a validly-signed webhook whose timestamp is 10 minutes old (401, records nothing)', async () => {
    mock.state.tenantRows = [{ id: 'tenant-nyc', name: 'NYC Maid' }]
    const body = inboundCall(NYCMAID_DID)
    const staleTs = Math.floor(Date.now() / 1000) - 10 * 60 // outside the 5-min window
    const res = await POST(makeRequest(body, signedHeadersAt(body, staleTs)) as never)
    expect(res.status).toBe(401)
    expect(mock.state.inserts).toHaveLength(0)
  })

  it('accepts the SAME body when signed with a fresh timestamp (control — proves it was the staleness, not the payload)', async () => {
    mock.state.tenantRows = [{ id: 'tenant-nyc', name: 'NYC Maid' }]
    const body = inboundCall(NYCMAID_DID)
    const freshTs = Math.floor(Date.now() / 1000)
    const res = await POST(makeRequest(body, signedHeadersAt(body, freshTs)) as never)
    expect(res.status).toBe(200)
  })
})

describe('telnyx-voice — signature and tenant are independent gates', () => {
  it('a VALID signature over an UNKNOWN-DID payload still 404s and records nothing', async () => {
    mock.state.tenantRows = [] // no tenant owns the dialed number
    const body = inboundCall('+17778889999')
    const freshTs = Math.floor(Date.now() / 1000)
    const res = await POST(makeRequest(body, signedHeadersAt(body, freshTs)) as never)
    // Signature passes, but tenant resolution fails closed → 404, not 200.
    expect(res.status).toBe(404)
    expect(mock.state.inserts).toHaveLength(0)
  })
})
