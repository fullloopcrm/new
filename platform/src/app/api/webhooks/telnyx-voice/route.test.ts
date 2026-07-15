import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'

/**
 * Telnyx VOICE webhook — the two trust boundaries this route must hold:
 *
 *  1. SIGNATURE (toll-fraud / call forgery): every call-control event drives
 *     dialing, recording, transcription and outbound SMS. An unsigned or forged
 *     event MUST be rejected (401) before any of that runs. The route used to
 *     fail OPEN — it only checked that a signature header was *present*, never
 *     that it was valid, and skipped entirely when no public key was set.
 *
 *  2. TENANT (cross-routing): the tenant used to be HARDCODED to nycmaid and
 *     payload.to (the dialed DID) was ignored, so a second voice tenant would
 *     silently record/transcribe/SMS under nycmaid. Tenant must now derive from
 *     the DID (tenants.telnyx_phone), FAIL CLOSED on unknown/ambiguous, and
 *     never default to nycmaid.
 *
 * We mock only supabase + the SMS sender. verifyTelnyx runs for real so the
 * signature assertions exercise the actual Ed25519 path.
 *
 * Also covers a real bug found while porting this suite: the inbound-call
 * handler resolves the correct tenant from the dialed DID (fail-closed per
 * above), but the comhub_get_or_create_contact_by_phone / comhub_get_or_create_thread
 * RPC calls hardcoded p_tenant_id to NYCMAID_TENANT_ID regardless — so a second
 * voice tenant's contact/thread records were still created under nycmaid's
 * tenant scope even though the resolved tenant_id was correct everywhere else.
 * Fixed to pass the resolved tenantId; see the RPC-args assertions below.
 */

const NYCMAID_TENANT_ID = '00000000-0000-0000-0000-000000000001'
const NYCMAID_DID = '+18883164019'

// Stateful, chainable Supabase stub. The chain is thenable so `await
// from().update().eq()` and `await from().insert({...})` both resolve, while
// `.limit()`/`.single()` return table-specific data. Inserts are captured so we
// can assert which tenant_id a call was recorded under.
const mock = vi.hoisted(() => {
  const state: {
    tenantRows: Array<{ id: string; name: string }>
    inserts: Array<{ table: string; row: unknown }>
    rpcCalls: Array<{ name: string; args: Record<string, unknown> }>
  } = {
    tenantRows: [],
    inserts: [],
    rpcCalls: [],
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
      // Awaiting the chain directly (update().eq(), insert(), order() terminals).
      then: (resolve: (v: { data: null; error: null }) => void) => resolve({ data: null, error: null }),
    }
    return chain
  }

  const supabaseAdmin = {
    from: (table: string) => makeChain(table),
    rpc: async (fn: string, args?: Record<string, unknown>) => {
      state.rpcCalls.push({ name: fn, args: args || {} })
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

// Ed25519 keypair for signing test webhooks. Telnyx public keys are the raw
// 32-byte key base64-encoded — the last 32 bytes of the DER SPKI.
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

function signedHeaders(body: string): Record<string, string> {
  const ts = Math.floor(Date.now() / 1000).toString()
  const sig = cryptoSign(null, Buffer.from(`${ts}|${body}`, 'utf8'), privateKey).toString('base64')
  return { 'telnyx-timestamp': ts, 'telnyx-signature-ed25519': sig }
}

function inboundCall(to: string): string {
  return JSON.stringify({
    data: {
      event_type: 'call.initiated',
      payload: {
        call_control_id: 'cc-1',
        from: '+15551234567',
        to,
        direction: 'incoming',
      },
    },
  })
}

beforeEach(() => {
  mock.state.tenantRows = []
  mock.state.inserts = []
  mock.state.rpcCalls = []
  process.env.TELNYX_PUBLIC_KEY = RAW_PUB
  delete process.env.TELNYX_VOICE_WEBHOOK_VERIFY
  // Guarantee no real Telnyx HTTP even if the ambient env has an API key set.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({ ok: true, json: async () => ({ data: {} }), text: async () => '' })),
  )
})

describe('telnyx-voice — signature (fail closed)', () => {
  it('rejects an UNSIGNED webhook with 401', async () => {
    mock.state.tenantRows = [{ id: NYCMAID_TENANT_ID, name: 'NYC Maid' }]
    const res = await POST(makeRequest(inboundCall(NYCMAID_DID), {}) as never)
    expect(res.status).toBe(401)
    // Nothing should have been recorded for an unauthenticated event.
    expect(mock.state.inserts).toHaveLength(0)
  })

  it('rejects a FORGED signature (body tampered after signing) with 401', async () => {
    const realBody = inboundCall(NYCMAID_DID)
    const headers = signedHeaders(realBody)
    // Attacker keeps the valid signature but swaps the payload.
    const tampered = inboundCall('+19998887777')
    const res = await POST(makeRequest(tampered, headers) as never)
    expect(res.status).toBe(401)
    expect(mock.state.inserts).toHaveLength(0)
  })

  it('rejects when NO public key is configured (fail closed, not open)', async () => {
    delete process.env.TELNYX_PUBLIC_KEY
    const body = inboundCall(NYCMAID_DID)
    const res = await POST(makeRequest(body, signedHeaders(body)) as never)
    expect(res.status).toBe(401)
  })

  it('accepts a VALID signature and resolves the nycmaid DID (200)', async () => {
    mock.state.tenantRows = [{ id: NYCMAID_TENANT_ID, name: 'NYC Maid' }]
    const body = inboundCall(NYCMAID_DID)
    const res = await POST(makeRequest(body, signedHeaders(body)) as never)
    expect(res.status).toBe(200)
    const activeCall = mock.state.inserts.find(i => i.table === 'comhub_active_calls')
    expect(activeCall).toBeDefined()
    expect((activeCall!.row as { tenant_id: string }).tenant_id).toBe(NYCMAID_TENANT_ID)
  })
})

describe('telnyx-voice — tenant resolution from DID (fail closed)', () => {
  beforeEach(() => {
    // Isolate resolution from crypto for these cases.
    process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
  })

  it('REJECTS an unknown DID (no tenant) with 404 and records nothing', async () => {
    mock.state.tenantRows = [] // no tenant owns this number
    const res = await POST(makeRequest(inboundCall('+17778889999'), {}) as never)
    expect(res.status).toBe(404)
    expect(mock.state.inserts).toHaveLength(0)
  })

  it('REJECTS an ambiguous DID (shared number, 2 tenants) with 409', async () => {
    mock.state.tenantRows = [
      { id: 'tenant-a', name: 'A' },
      { id: 'tenant-b', name: 'B' },
    ]
    const res = await POST(makeRequest(inboundCall('+12122028400'), {}) as never)
    expect(res.status).toBe(409)
    expect(mock.state.inserts).toHaveLength(0)
  })

  it('routes a SECOND voice tenant to ITS OWN tenant_id, never nycmaid', async () => {
    mock.state.tenantRows = [{ id: 'tenant-2', name: 'Second Cleaner' }]
    const res = await POST(makeRequest(inboundCall('+15559990000'), {}) as never)
    expect(res.status).toBe(200)
    const activeCall = mock.state.inserts.find(i => i.table === 'comhub_active_calls')
    expect(activeCall).toBeDefined()
    const tenantId = (activeCall!.row as { tenant_id: string }).tenant_id
    expect(tenantId).toBe('tenant-2')
    expect(tenantId).not.toBe(NYCMAID_TENANT_ID)
    // The message log for this call must also be scoped to tenant-2.
    const msg = mock.state.inserts.find(i => i.table === 'comhub_messages')
    expect((msg!.row as { tenant_id: string }).tenant_id).toBe('tenant-2')
    // Regression: the comhub contact/thread RPCs must receive the RESOLVED
    // tenant, not a hardcoded nycmaid id — this was a real bug (fixed) where
    // both calls hardcoded NYCMAID_TENANT_ID even after tenant resolution
    // correctly identified a different tenant.
    const contactCall = mock.state.rpcCalls.find(c => c.name === 'comhub_get_or_create_contact_by_phone')
    expect(contactCall?.args.p_tenant_id).toBe('tenant-2')
    expect(contactCall?.args.p_phone).toBe('+15551234567')
    const threadCall = mock.state.rpcCalls.find(c => c.name === 'comhub_get_or_create_thread')
    expect(threadCall?.args.p_tenant_id).toBe('tenant-2')
    expect(threadCall?.args.p_contact_id).toBe('contact-1')
    expect(threadCall?.args.p_channel).toBe('voice')
  })
})
