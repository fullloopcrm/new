import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * W4: buildRingTargets() stored each admin's ring_strategy and
 * do_not_disturb_until (comhub_admin_voice_settings, writable via the
 * /admin/comhub/voice/settings UI) but never read either — every inbound
 * call rang an admin's PSTN cell fallback regardless of a 'browser_only'
 * choice or an active do-not-disturb window, and rang their browser
 * softphone regardless of a 'cell_only' choice. Real cost: 'browser_only'
 * exists specifically to avoid live per-minute PSTN dial-out to a personal
 * cell, and it was silently never honored.
 *
 * This file proves buildRingTargets() (exercised via the inbound-call POST
 * handler) now respects both settings on each leg independently.
 */

const TENANT_A = 'tenant-a'
const DID_A = '+15550001111'

const mock = vi.hoisted(() => {
  process.env.TELNYX_API_KEY = 'test-key'
  process.env.TELNYX_VOICE_CONNECTION_ID = 'conn-1'

  const state = {
    tenantRows: [] as Array<{ id: string; name: string }>,
    presenceRows: [] as Array<{
      tenant_id: string
      admin_id: string
      sip_username: string
      sip_address: string
      status: string
      last_seen_at: string
    }>,
    voiceSettingsRows: [] as Array<{
      tenant_id: string
      admin_id: string
      fallback_cell_phone: string
      ring_strategy?: string
      do_not_disturb_until?: string | null
    }>,
    fetchCalls: [] as Array<{ url: string; to: string | null }>,
  }

  function makeChain(table: string) {
    let tenantFilter: string | null = null
    const chain: Record<string, unknown> = {
      select: () => chain,
      insert: () => chain,
      update: () => chain,
      eq: (col: string, val: string) => {
        if (col === 'tenant_id') tenantFilter = val
        return chain
      },
      or: () => chain,
      gte: () => chain,
      order: () => chain,
      limit: async () =>
        table === 'tenants' ? { data: state.tenantRows, error: null } : { data: [], error: null },
      single: async () => ({ data: null, error: null }),
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

beforeEach(() => {
  mock.state.tenantRows = [{ id: TENANT_A, name: 'Tenant A' }]
  mock.state.presenceRows = []
  mock.state.voiceSettingsRows = []
  mock.state.fetchCalls = []
  process.env.TELNYX_WEBHOOK_VERIFY = 'off'
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

describe('telnyx-voice — ring_strategy / do_not_disturb_until are honored', () => {
  it("'browser_only' admin with no online softphone is never dialed on their PSTN cell, even though it's configured", async () => {
    // No presence row — admin's browser softphone isn't online. Without the
    // ring_strategy filter, buildRingTargets() falls back to the phone
    // target as ringTargets[0] and the initial call.initiated handler dials
    // it immediately. This is the direct proof the phone-leg filter fires:
    // if it didn't, this test's cellDial assertion would fail.
    mock.state.voiceSettingsRows = [
      {
        tenant_id: TENANT_A,
        admin_id: 'admin-a',
        fallback_cell_phone: '+15551110000',
        ring_strategy: 'browser_only',
      },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    // The configured cell must never be dialed for a browser_only admin.
    const cellDial = mock.state.fetchCalls.find(c => c.to === '+15551110000')
    expect(cellDial).toBeUndefined()
    // Ring list is empty (no online softphone, cell filtered out) → voicemail.
    const voicemailAction = mock.state.fetchCalls.find(c => c.url.includes('/actions/gather_using_speak'))
    expect(voicemailAction).toBeDefined()
  })

  it("'cell_only' admin's online browser softphone is skipped — dials their cell instead", async () => {
    mock.state.presenceRows = [
      {
        tenant_id: TENANT_A,
        admin_id: 'admin-a',
        sip_username: 'alice',
        sip_address: 'sip:alice@sip.telnyx.com',
        status: 'available',
        last_seen_at: new Date().toISOString(),
      },
    ]
    mock.state.voiceSettingsRows = [
      {
        tenant_id: TENANT_A,
        admin_id: 'admin-a',
        fallback_cell_phone: '+15551110000',
        ring_strategy: 'cell_only',
      },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    const sipTransfer = mock.state.fetchCalls.find(c => c.to === 'sip:alice@sip.telnyx.com')
    expect(sipTransfer).toBeUndefined()
    const cellDial = mock.state.fetchCalls.find(c => c.to === '+15551110000')
    expect(cellDial).toBeDefined()
  })

  it('an admin with an active do_not_disturb_until window is skipped on BOTH legs', async () => {
    mock.state.presenceRows = [
      {
        tenant_id: TENANT_A,
        admin_id: 'admin-a',
        sip_username: 'alice',
        sip_address: 'sip:alice@sip.telnyx.com',
        status: 'available',
        last_seen_at: new Date().toISOString(),
      },
    ]
    mock.state.voiceSettingsRows = [
      {
        tenant_id: TENANT_A,
        admin_id: 'admin-a',
        fallback_cell_phone: '+15551110000',
        ring_strategy: 'browser_then_cell',
        do_not_disturb_until: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    expect(mock.state.fetchCalls.find(c => c.to === 'sip:alice@sip.telnyx.com')).toBeUndefined()
    expect(mock.state.fetchCalls.find(c => c.to === '+15551110000')).toBeUndefined()
    // Ring list is empty for this tenant → straight to voicemail.
    const voicemailAction = mock.state.fetchCalls.find(c => c.url.includes('/actions/gather_using_speak'))
    expect(voicemailAction).toBeDefined()
  })

  it('an EXPIRED do_not_disturb_until (in the past) does not block ringing', async () => {
    mock.state.voiceSettingsRows = [
      {
        tenant_id: TENANT_A,
        admin_id: 'admin-a',
        fallback_cell_phone: '+15551110000',
        ring_strategy: 'browser_then_cell',
        do_not_disturb_until: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ]

    const res = await POST(makeRequest(inboundCall(DID_A)) as never)
    expect(res.status).toBe(200)

    const cellDial = mock.state.fetchCalls.find(c => c.to === '+15551110000')
    expect(cellDial).toBeDefined()
  })
})
