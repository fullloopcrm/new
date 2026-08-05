import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4 regression lock for the ADMIN_RING tenant-scoping fix.
 *
 * Before this fix, buildRingTargets() (a) queried comhub_admin_presence with
 * NO tenant_id filter — any tenant's online softphone could ring for any
 * other tenant's inbound call — and (b) sourced PSTN fallback numbers from a
 * single global ADMIN_RING_LIST env var, so every tenant that had no online
 * softphone rang the SAME hardcoded (nycmaid) cell numbers regardless of
 * which tenant's DID the customer actually dialed. notifyVoicemailToAdmin
 * had the identical bug via VOICEMAIL_NOTIFY_PHONE (derived from
 * ADMIN_RING_LIST[0]).
 *
 * This file proves: a call resolved to tenant-A only ever rings tenant-A's
 * configured admin presence / cell numbers — never tenant-B's, even when
 * tenant-B has an online softphone or configured cell and tenant-A does not.
 */

const TENANT_A = 'tenant-a'
const TENANT_B = 'tenant-b'
const DID_A = '+15550001111'

const mock = vi.hoisted(() => {
  // Must be set before route.ts is imported below — TELNYX_API_KEY and
  // TELNYX_VOICE_CONNECTION_ID are read into module-level consts at import
  // time, so setting them in beforeEach() would be too late.
  process.env.TELNYX_API_KEY = 'test-key'
  process.env.TELNYX_VOICE_CONNECTION_ID = 'conn-1'

  const state = {
    tenantRows: [] as Array<{ id: string; name: string }>,
    presenceRows: [] as Array<{ tenant_id: string; admin_id: string; sip_username: string; sip_address: string; status: string; last_seen_at: string }>,
    voiceSettingsRows: [] as Array<{ tenant_id: string; admin_id: string; fallback_cell_phone: string }>,
    fetchCalls: [] as Array<{ url: string; to: string | null }>,
    // The ComHub-first grace window (before ringing a cell-only target)
    // resumes via call.gather.ended, which looks up comhub_active_calls by
    // customer_call_id and only proceeds if status is still 'ringing' — so
    // these tests need that table's insert/update/select actually modeled,
    // not just ignored like the other tables here.
    activeCalls: [] as Array<Record<string, unknown>>,
  }

  function makeChain(table: string) {
    let tenantFilter: string | null = null
    let customerCallIdFilter: string | null = null
    let pendingPatch: Record<string, unknown> | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: (row: Record<string, unknown>) => {
        if (table === 'comhub_active_calls') state.activeCalls.push({ ...row })
        return chain
      },
      update: (patch: Record<string, unknown>) => {
        pendingPatch = patch
        return chain
      },
      eq: (col: string, val: string) => {
        if (col === 'tenant_id') tenantFilter = val
        if (col === 'customer_call_id') customerCallIdFilter = val
        if (table === 'comhub_active_calls' && pendingPatch && col === 'customer_call_id') {
          const row = state.activeCalls.find(r => r.customer_call_id === val)
          if (row) Object.assign(row, pendingPatch)
        }
        return chain
      },
      or: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: async () =>
        table === 'tenants' ? { data: state.tenantRows, error: null } : { data: [], error: null },
      single: async () => {
        if (table === 'comhub_active_calls' && customerCallIdFilter) {
          const row = state.activeCalls.find(r => r.customer_call_id === customerCallIdFilter)
          return { data: row ?? null, error: null }
        }
        return { data: null, error: null }
      },
      then: (resolve: (v: { data: unknown; error: null }) => void) => {
        if (table === 'comhub_admin_presence') {
          resolve({ data: state.presenceRows.filter(r => r.tenant_id === tenantFilter), error: null })
          return
        }
        if (table === 'comhub_admin_voice_settings') {
          resolve({ data: state.voiceSettingsRows.filter(r => r.tenant_id === tenantFilter), error: null })
          return
        }
        resolve({ data: null, error: null })
      },
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

function makeRequest(body: string): Request {
  return new Request('http://localhost/api/webhooks/telnyx-voice', {
    method: 'POST',
    headers: new Headers({}),
    body,
  })
}

function inboundCall(to: string): string {
  return JSON.stringify({
    data: {
      event_type: 'call.initiated',
      payload: { call_control_id: 'cc-1', from: '+15559998888', to, direction: 'incoming' },
    },
  })
}

// Resumes the ComHub-first grace window inserted before a cell-only dial
// (see advanceRingOrVoicemail in route.ts) — the grace prompt's own
// call.gather.ended completion is what actually triggers the phone dial.
function gatherEnded(callControlId: string): string {
  return JSON.stringify({
    data: {
      event_type: 'call.gather.ended',
      payload: { call_control_id: callControlId },
    },
  })
}

beforeEach(() => {
  mock.state.tenantRows = []
  mock.state.presenceRows = []
  mock.state.voiceSettingsRows = []
  mock.state.fetchCalls = []
  mock.state.activeCalls = []
  process.env.TELNYX_VOICE_WEBHOOK_VERIFY = 'off'
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: { body?: string }) => {
      let to: string | null = null
      try {
        to = init?.body ? (JSON.parse(init.body).to ?? null) : null
      } catch {
        to = null
      }
      mock.state.fetchCalls.push({ url: String(url), to })
      return { ok: true, json: async () => ({ data: { call_control_id: 'admin-cc-1' } }), text: async () => '' }
    }),
  )
})

describe('telnyx-voice — ADMIN_RING is tenant-scoped', () => {
  it('never rings tenant-B\'s online softphone for tenant-A\'s inbound call', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    // Only tenant-B has an online softphone; tenant-A has none.
    mock.state.presenceRows = [
      {
        tenant_id: TENANT_B,
        admin_id: 'admin-b',
        sip_username: 'bob',
        sip_address: 'sip:bob@sip.telnyx.com',
        status: 'available',
        last_seen_at: new Date().toISOString(),
      },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    // No transfer/dial call ever references tenant-B's SIP address.
    const leaked = mock.state.fetchCalls.find(c => c.to === 'sip:bob@sip.telnyx.com')
    expect(leaked).toBeUndefined()
  })

  // SKIPPED: cell forwarding is temporarily disabled in buildRingTargets
  // (only sipAddr targets survive) per an explicit "stop calling my phone"
  // request. Restore this test when cell forwarding is turned back on.
  it.skip('never rings tenant-B\'s configured cell for tenant-A\'s inbound call — dials tenant-A\'s own cell instead', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    mock.state.voiceSettingsRows = [
      { tenant_id: TENANT_A, admin_id: 'admin-a', fallback_cell_phone: '+15551110000' },
      { tenant_id: TENANT_B, admin_id: 'admin-b', fallback_cell_phone: '+15552220000' },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    // Cell is the only ring target (no online softphone) — the ComHub-first
    // grace window fires instead of an immediate dial. Resume it, same as
    // Telnyx would on the real gather's timeout.
    const graceAction = mock.state.fetchCalls.find(c => c.url.includes('/actions/gather_using_speak'))
    expect(graceAction).toBeDefined()
    expect(mock.state.fetchCalls.find(c => c.url === 'https://api.telnyx.com/v2/calls')).toBeUndefined()

    await POST(makeRequest(gatherEnded('cc-1')) as never)

    const dialCall = mock.state.fetchCalls.find(c => c.url === 'https://api.telnyx.com/v2/calls')
    expect(dialCall).toBeDefined()
    expect(dialCall!.to).toBe('+15551110000')
    expect(dialCall!.to).not.toBe('+15552220000')
  })

  it('falls through to voicemail (no dial at all) when tenant-A has no presence and no configured cell, even though tenant-B has both', async () => {
    mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
    mock.state.presenceRows = [
      {
        tenant_id: TENANT_B,
        admin_id: 'admin-b',
        sip_username: 'bob',
        sip_address: 'sip:bob@sip.telnyx.com',
        status: 'available',
        last_seen_at: new Date().toISOString(),
      },
    ]
    mock.state.voiceSettingsRows = [
      { tenant_id: TENANT_B, admin_id: 'admin-b', fallback_cell_phone: '+15552220000' },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    // No admin transfer/dial fetch fired for either tenant-B target.
    const dialFetch = mock.state.fetchCalls.find(
      c => c.url === 'https://api.telnyx.com/v2/calls' || c.to === 'sip:bob@sip.telnyx.com',
    )
    expect(dialFetch).toBeUndefined()
    // The voicemail prompt action (gather_using_speak) fired on the customer leg instead.
    const voicemailAction = mock.state.fetchCalls.find(c => c.url.includes('/actions/gather_using_speak'))
    expect(voicemailAction).toBeDefined()
  })
})
